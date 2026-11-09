import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Range } from '../calendar/dates'
import { tasksApi, type DeleteScope, type Task, type TaskInput, type TaskPatch } from './api'

const KEY = 'tasks'

/** Tareas de un rango visible (RF-008). Cada rango tiene su propia caché. */
export function useTasksRange(range: Range) {
  const from = range.from.toISOString()
  const to = range.to.toISOString()
  return useQuery({
    queryKey: [KEY, 'range', from, to],
    queryFn: ({ signal }) => tasksApi.list(range.from, range.to, signal),
    staleTime: 15_000,
  })
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'one', id],
    queryFn: () => tasksApi.get(id ?? ''),
    enabled: Boolean(id),
  })
}

function applyPatch(task: Task, patch: TaskPatch): Task {
  const next: Task = { ...task }
  if (patch.title !== undefined) next.title = patch.title
  if (patch.start_at !== undefined) next.start_at = patch.start_at
  if (patch.duration_minutes !== undefined) next.duration_minutes = patch.duration_minutes
  if (patch.notes !== undefined) next.notes = patch.notes
  if (patch.reminder !== undefined) {
    next.reminder = patch.reminder
    next.reminder_enabled = patch.reminder !== null
  }
  if (patch.completed !== undefined) {
    next.completed = patch.completed
    next.completed_at = patch.completed ? new Date().toISOString() : null
  }
  return next
}

type Snapshot = [readonly unknown[], Task[] | undefined][]

function useOptimistic<TVars>(
  mutationFn: (vars: TVars) => Promise<unknown>,
  update: (items: Task[], vars: TVars) => Task[],
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    // Se actualiza la pantalla al instante (RNF-002) y se revierte si el servidor falla.
    onMutate: async (vars: TVars) => {
      // 1) Se cancelan las consultas en curso (la parte síncrona ya revierte su estado)…
      const cancelling = queryClient.cancelQueries({ queryKey: [KEY] })
      // 2) …y SIN esperar se pinta el cambio, para que la casilla/tarea responda al instante.
      const snapshot: Snapshot = queryClient.getQueriesData<Task[]>({
        queryKey: [KEY, 'range'],
      })
      queryClient.setQueriesData<Task[]>({ queryKey: [KEY, 'range'] }, (items) =>
        items ? update(items, vars) : items,
      )
      await cancelling
      return { snapshot }
    },
    onError: (_error, _vars, context) => {
      context?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data))
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  })
}

/** Cambios sobre una tarea existente (mover, completar…), con actualización optimista. */
export function useUpdateTask() {
  return useOptimistic<{ id: string; patch: TaskPatch }>(
    ({ id, patch }) => tasksApi.update(id, patch),
    (items, { id, patch }) => items.map((t) => (t.id === id ? applyPatch(t, patch) : t)),
  )
}

/** Borra una tarea; con «following» y una repetición, también las siguientes de su serie. */
export function useDeleteTask() {
  return useOptimistic<{ task: Task; scope: DeleteScope }>(
    ({ task, scope }) => tasksApi.remove(task.id, scope),
    (items, { task, scope }) =>
      items.filter((t) => {
        if (t.id === task.id) return false
        const sameSeries = scope === 'following' && task.series_id && t.series_id === task.series_id
        return !(sameSeries && t.start_at >= task.start_at)
      }),
  )
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: TaskInput) => tasksApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  })
}
