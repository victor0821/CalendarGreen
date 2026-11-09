import { request } from '../api/client'

export type TaskSource = 'manual' | 'voice' | 'text'
export type ReminderUnit = 'minutes' | 'hours' | 'days' | 'weeks'
export type RepeatKind = 'weekly' | 'weekdays' | 'daily' | 'custom'

/** Cuánto antes avisar (RF-034). */
export interface Reminder {
  amount: number
  unit: ReminderUnit
}

/** Regla de repetición: `days` son días ISO (1 = lunes … 7 = domingo). */
export interface Repeat {
  kind: RepeatKind
  days?: number[]
}

export interface Task {
  id: string
  title: string
  start_at: string // ISO 8601 en UTC
  duration_minutes: number
  notes: string | null
  completed: boolean
  completed_at: string | null
  source: TaskSource
  reminder_enabled: boolean
  reminder: Reminder | null
  /** Serie de repetición a la que pertenece (null si no se repite). */
  series_id: string | null
  /** Regla de la serie: solo viene al pedir una tarea individual, no en los listados. */
  repeat?: { kind: RepeatKind; days: number[] } | null
  created_at: string
  updated_at: string
}

export interface TaskInput {
  title: string
  start_at: string
  duration_minutes: number
  notes: string | null
  /** null = sin aviso. */
  reminder: Reminder | null
  /** Si viene, se crea una serie de repeticiones. */
  repeat?: Repeat
  source?: TaskSource
}

export type TaskPatch = Partial<{
  title: string
  start_at: string
  duration_minutes: number
  notes: string | null
  reminder: Reminder | null
  completed: boolean
}>

/** «this»: solo esta tarea; «following»: esta y las siguientes de su serie (RF-033). */
export type DeleteScope = 'this' | 'following'

export const tasksApi = {
  list: (from: Date, to: Date, signal?: AbortSignal) =>
    request<{ items: Task[] }>('/tasks', {
      query: { from: from.toISOString(), to: to.toISOString() },
      signal,
    }).then((r) => r.items),
  get: (id: string) => request<Task>(`/tasks/${id}`),
  create: (input: TaskInput) => request<Task>('/tasks', { method: 'POST', body: input }),
  update: (id: string, patch: TaskPatch) =>
    request<Task>(`/tasks/${id}`, { method: 'PATCH', body: patch }),
  remove: (id: string, scope: DeleteScope = 'this') =>
    request<void>(`/tasks/${id}`, { method: 'DELETE', query: { scope } }),
}

export function taskEnd(task: Pick<Task, 'start_at' | 'duration_minutes'>): Date {
  return new Date(new Date(task.start_at).getTime() + task.duration_minutes * 60_000)
}
