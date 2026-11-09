import { formatMinutes } from './dates'

export interface Interval {
  start: number // minutos desde las 00:00 locales
  end: number
}

const DAY = 1440

/** Une intervalos que se tocan o se solapan. */
function merge(intervals: Interval[]): Interval[] {
  const sorted = intervals
    .map((i) => ({ start: Math.max(0, i.start), end: Math.min(DAY, i.end) }))
    .filter((i) => i.end > i.start)
    .sort((a, b) => a.start - b.start)
  const merged: Interval[] = []
  for (const interval of sorted) {
    const last = merged[merged.length - 1]
    if (last && interval.start <= last.end) last.end = Math.max(last.end, interval.end)
    else merged.push({ ...interval })
  }
  return merged
}

function listInSpanish(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`
}

export interface FreeTime {
  gaps: Interval[]
  text: string
}

/**
 * Tiempo libre del día (RF-027, Q-19: el día completo, de 00:00 a 24:00).
 * Ejemplo: «antes de las 10:00 a. m., de 11:00 a. m. a 6:00 p. m. y después de las 6:30 p. m.»
 */
export function freeTime(busy: Interval[]): FreeTime {
  const merged = merge(busy)
  if (merged.length === 0) return { gaps: [{ start: 0, end: DAY }], text: 'Todo el día libre.' }

  const gaps: Interval[] = []
  const parts: string[] = []
  const first = merged[0]!
  if (first.start > 0) {
    gaps.push({ start: 0, end: first.start })
    parts.push(`antes de las ${formatMinutes(first.start)}`)
  }
  for (let i = 1; i < merged.length; i++) {
    const prev = merged[i - 1]!
    const next = merged[i]!
    gaps.push({ start: prev.end, end: next.start })
    parts.push(`de ${formatMinutes(prev.end)} a ${formatMinutes(next.start)}`)
  }
  const last = merged[merged.length - 1]!
  if (last.end < DAY) {
    gaps.push({ start: last.end, end: DAY })
    parts.push(`después de las ${formatMinutes(last.end)}`)
  }
  if (parts.length === 0) return { gaps, text: 'No tienes tiempo libre este día.' }
  // «a. m.» y «p. m.» ya terminan en punto: no se agrega otro.
  const sentence = `Tu tiempo libre: ${listInSpanish(parts)}`
  return { gaps, text: sentence.endsWith('.') ? sentence : `${sentence}.` }
}

/** «2 tareas · 1 hecha» (RF-027). */
export function dayCounts(total: number, done: number): string {
  const tasks = total === 1 ? '1 tarea' : `${total} tareas`
  const doneText = done === 1 ? '1 hecha' : `${done} hechas`
  return `${tasks} · ${doneText}`
}
