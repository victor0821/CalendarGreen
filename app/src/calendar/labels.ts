import type { Task } from '../tasks/api'
import { formatMinutes, longDate, toLocal } from './dates'

/** Etiqueta accesible de una tarea (RF-026). */
export function taskAriaLabel(task: Task, timezone: string): string {
  const { date, minutes } = toLocal(new Date(task.start_at), timezone)
  const parts = [task.title, longDate(date), formatMinutes(minutes)]
  if (task.source === 'voice') parts.push('creada por voz')
  if (task.series_id) parts.push('se repite')
  if (task.completed) parts.push('completada')
  return parts.join(', ')
}

/** «3 p. m.» para el eje de horas. */
export function hourLabel(hour: number): string {
  return `${hour % 12 === 0 ? 12 : hour % 12} ${hour < 12 ? 'a. m.' : 'p. m.'}`
}
