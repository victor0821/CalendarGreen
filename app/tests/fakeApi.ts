/** Servidor falso en memoria: imita la API real (/api/v1) para probar las pantallas sin red. */
import { vi } from 'vitest'
import type { Task } from '../src/tasks/api'

export interface FakeUser {
  id: string
  email: string
  password: string
  timezone: string
}

type StoredTask = Task & { user_id: string }

export interface FakeSeries {
  id: string
  kind: string
  days: number[]
}

export interface FakeApi {
  users: FakeUser[]
  tasks: StoredTask[]
  series: FakeSeries[]
  calls: { method: string; path: string; body: unknown; query: string }[]
  /** Hace que la próxima petición que coincida con «METHOD /ruta» falle con ese estado. */
  failNext: (match: string, status?: number, code?: string) => void
  networkDown: boolean
  addUser: (email?: string, password?: string, timezone?: string) => FakeUser
  tokenFor: (user: FakeUser) => string
  seed: (user: FakeUser, task: Partial<Task> & Pick<Task, 'title' | 'start_at'>) => Task
}

let counter = 0
const uid = () => `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}
const error = (status: number, code: string, message: string, headers?: Record<string, string>) =>
  json(status, { error: { code, message } }, headers)

// Las pruebas usan America/Bogota (UTC−5, sin cambio de horario): basta un desfase fijo.
const BOGOTA_OFFSET_MS = -5 * 3_600_000
const DAY_MS = 86_400_000
const isoWeekday = (ms: number) => ((new Date(ms + BOGOTA_OFFSET_MS).getUTCDay() + 6) % 7) + 1

function repeatDays(kind: string, custom: number[] | undefined, startMs: number): number[] {
  if (kind === 'weekly') return [isoWeekday(startMs)]
  if (kind === 'weekdays') return [1, 2, 3, 4, 5]
  if (kind === 'daily') return [1, 2, 3, 4, 5, 6, 7]
  return custom ?? []
}

export function installFakeApi(): FakeApi {
  const api: FakeApi = {
    users: [],
    tasks: [],
    series: [],
    calls: [],
    networkDown: false,
    failNext: () => {},
    addUser: (
      email = 'ana@correo.com',
      password = 'una-contraseña-segura',
      timezone = 'America/Bogota',
    ) => {
      const user = { id: uid(), email, password, timezone }
      api.users.push(user)
      return user
    },
    tokenFor: (user) => `token-${user.id}`,
    seed: (user, task) => {
      const full = {
        id: uid(),
        user_id: user.id,
        duration_minutes: 30,
        notes: null,
        completed: false,
        completed_at: null,
        source: 'manual',
        reminder_enabled: true,
        reminder: { amount: 15, unit: 'minutes' },
        series_id: null,
        created_at: '2026-10-01T00:00:00Z',
        updated_at: '2026-10-01T00:00:00Z',
        ...task,
      } as StoredTask
      api.tasks.push(full)
      return full
    },
  }

  const failures: { match: string; status: number; code: string }[] = []
  api.failNext = (match, status = 500, code = 'internal_error') =>
    failures.push({ match, status, code })

  const userFromRequest = (init?: RequestInit): FakeUser | null => {
    const header = new Headers(init?.headers).get('Authorization') ?? ''
    const token = header.replace('Bearer ', '')
    return api.users.find((u) => api.tokenFor(u) === token) ?? null
  }
  // La API real nunca devuelve user_id; `repeat` solo viene en las respuestas de una tarea.
  const publicTask = (stored: StoredTask, withRepeat = false): Task => {
    const copy: Partial<StoredTask> = { ...stored }
    delete copy.user_id
    if (withRepeat && stored.series_id) {
      const series = api.series.find((s) => s.id === stored.series_id)
      if (series) copy.repeat = { kind: series.kind as 'weekly', days: series.days }
    }
    return copy as Task
  }

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      if (api.networkDown) throw new TypeError('Failed to fetch')
      const url = new URL(String(input), 'http://localhost')
      const path = url.pathname.replace('/api/v1', '')
      const method = (init?.method ?? 'GET').toUpperCase()
      const body = init?.body ? JSON.parse(String(init.body)) : undefined
      api.calls.push({ method, path, body, query: url.search })

      const failure = failures.findIndex((f) => `${method} ${path}`.startsWith(f.match))
      if (failure !== -1) {
        const [f] = failures.splice(failure, 1)
        return error(f!.status, f!.code, 'Error simulado.')
      }

      if (method === 'POST' && path === '/auth/register') {
        const email = String(body.email).trim().toLowerCase()
        if (api.users.some((u) => u.email === email)) {
          return error(
            409,
            'email_already_registered',
            'Ese correo ya tiene una cuenta. Inicia sesión.',
          )
        }
        const user = api.addUser(email, body.password, body.timezone ?? 'America/Bogota')
        return json(201, {
          access_token: api.tokenFor(user),
          token_type: 'bearer',
          user: { id: user.id, email: user.email, timezone: user.timezone },
        })
      }
      if (method === 'POST' && path === '/auth/login') {
        const email = String(body.email).trim().toLowerCase()
        const user = api.users.find((u) => u.email === email && u.password === body.password)
        if (!user) return error(401, 'invalid_credentials', 'Correo o contraseña incorrectos.')
        return json(200, {
          access_token: api.tokenFor(user),
          token_type: 'bearer',
          user: { id: user.id, email: user.email, timezone: user.timezone },
        })
      }

      const user = userFromRequest(init)
      if (!user) return error(401, 'unauthorized', 'Tu sesión no es válida o venció.')

      if (method === 'GET' && path === '/auth/me') {
        return json(200, { id: user.id, email: user.email, timezone: user.timezone })
      }
      if (path === '/tasks' && method === 'GET') {
        const from = new Date(url.searchParams.get('from') ?? '').getTime()
        const to = new Date(url.searchParams.get('to') ?? '').getTime()
        const items = api.tasks
          .filter((t) => t.user_id === user.id)
          .filter((t) => {
            const start = new Date(t.start_at).getTime()
            return start < to && start + t.duration_minutes * 60_000 > from
          })
          .sort((a, b) => a.start_at.localeCompare(b.start_at))
          .map((t) => publicTask(t))
        return json(200, { items })
      }
      if (path === '/tasks' && method === 'POST') {
        const now = new Date().toISOString()
        // Si se omite `reminder`: 15 minutos antes; `null`: sin aviso (como la API real).
        const reminder =
          body.reminder === undefined ? { amount: 15, unit: 'minutes' } : body.reminder
        const make = (startIso: string, seriesId: string | null): StoredTask =>
          ({
            id: uid(),
            user_id: user.id,
            title: String(body.title).trim(),
            start_at: new Date(startIso).toISOString(),
            duration_minutes: body.duration_minutes ?? 30,
            notes: body.notes ?? null,
            completed: false,
            completed_at: null,
            source: body.source ?? 'manual',
            reminder_enabled: reminder !== null,
            reminder,
            series_id: seriesId,
            created_at: now,
            updated_at: now,
          }) as StoredTask

        if (body.repeat) {
          const startMs = new Date(body.start_at).getTime()
          const days = repeatDays(body.repeat.kind, body.repeat.days, startMs)
          const series: FakeSeries = { id: uid(), kind: body.repeat.kind, days }
          api.series.push(series)
          const created: StoredTask[] = []
          for (let i = 0; i <= 365; i++) {
            const ms = startMs + i * DAY_MS
            if (days.includes(isoWeekday(ms)))
              created.push(make(new Date(ms).toISOString(), series.id))
          }
          api.tasks.push(...created)
          return json(201, publicTask(created[0]!, true))
        }
        const task = make(body.start_at, null)
        api.tasks.push(task)
        return json(201, publicTask(task))
      }
      const match = /^\/tasks\/([^/]+)$/.exec(path)
      if (match) {
        const task = api.tasks.find((t) => t.id === match[1] && t.user_id === user.id)
        if (!task) return error(404, 'not_found', 'No se encontró la tarea.')
        if (method === 'GET') return json(200, publicTask(task, true))
        if (method === 'DELETE') {
          const scope = url.searchParams.get('scope') ?? 'this'
          const doomed =
            scope === 'following' && task.series_id
              ? api.tasks.filter(
                  (t) => t.series_id === task.series_id && t.start_at >= task.start_at,
                )
              : [task]
          api.tasks = api.tasks.filter((t) => !doomed.includes(t))
          return json(204, null)
        }
        if (method === 'PATCH') {
          if (body.title !== undefined) task.title = String(body.title).trim()
          if (body.start_at !== undefined) task.start_at = new Date(body.start_at).toISOString()
          if (body.duration_minutes !== undefined) task.duration_minutes = body.duration_minutes
          if (body.notes !== undefined) task.notes = body.notes
          if (body.reminder !== undefined) {
            task.reminder = body.reminder
            task.reminder_enabled = body.reminder !== null
          }
          if (body.completed !== undefined) {
            task.completed = body.completed
            task.completed_at = body.completed ? new Date().toISOString() : null
          }
          return json(200, publicTask(task, true))
        }
      }
      return error(404, 'not_found', 'No se encontró lo que buscas.')
    }),
  )
  return api
}
