/**
 * Horas, repetición y aviso del formulario de tarea (RF-028, RF-029, RF-034).
 * Todo son funciones puras: se prueban sin interfaz.
 */
import { formatMinutes } from '../calendar/dates'
import type { ReminderUnit, RepeatKind } from './api'

// --- Horas de inicio y final (RF-028) --------------------------------------------------------

export const STEP = 30
export const DAY_END = 1440

const GRID = Array.from({ length: 24 * 2 }, (_, i) => i * STEP) // 0, 30 … 1410

const sorted = (list: number[]) => [...new Set(list)].sort((a, b) => a - b)

/** «12:00 a. m.» … «11:30 p. m.» cada 30 min. Incluye `current` si no cae en la cuadrícula. */
export function startOptions(current?: number): number[] {
  const extra = current !== undefined && current >= 0 && current < DAY_END ? [current] : []
  return sorted([...GRID, ...extra])
}

/** Horas posteriores a `start` hasta las 12:00 a. m. (medianoche); incluye `current` si no encaja. */
export function endOptions(start: number, current?: number): number[] {
  const grid = [...GRID.slice(1), DAY_END].filter((m) => m > start)
  const extra = current !== undefined && current > start ? [current] : []
  return sorted([...grid, ...extra])
}

/** «3:30 p. m.»; una hora final pasada la medianoche se marca como del día siguiente. */
export function optionLabel(minutes: number): string {
  return minutes > DAY_END ? `${formatMinutes(minutes)} (día siguiente)` : formatMinutes(minutes)
}

/** Hora final inicial: 30 minutos después, sin pasar de la medianoche. */
export function defaultEnd(start: number, duration = STEP): number {
  return Math.min(start + duration, DAY_END)
}

/** Al cambiar la hora de inicio, la final se desplaza conservando la duración si cabe (CA-20). */
export function shiftEnd(newStart: number, previousDuration: number): number {
  const end = newStart + previousDuration
  return end <= DAY_END ? end : DAY_END
}

// --- Repetición (RF-029) ----------------------------------------------------------------------

export type RepeatChoice = 'none' | RepeatKind

export const REPEAT_LABELS: Record<RepeatChoice, string> = {
  none: 'No se repite',
  weekly: 'Cada semana',
  weekdays: 'De lunes a viernes',
  daily: 'Todos los días',
  custom: 'Personalizado',
}
export const REPEAT_ORDER: RepeatChoice[] = ['none', 'weekly', 'weekdays', 'daily', 'custom']

/** Botones circulares del diseño: L M X J V S D (ISO 1 = lunes … 7 = domingo). */
export const DAY_CHIPS = [
  { iso: 1, letter: 'L', name: 'lunes' },
  { iso: 2, letter: 'M', name: 'martes' },
  { iso: 3, letter: 'X', name: 'miércoles' },
  { iso: 4, letter: 'J', name: 'jueves' },
  { iso: 5, letter: 'V', name: 'viernes' },
  { iso: 6, letter: 'S', name: 'sábado' },
  { iso: 7, letter: 'D', name: 'domingo' },
]

const dayName = (iso: number) => DAY_CHIPS.find((d) => d.iso === iso)?.name ?? ''

/** «lunes, martes, miércoles y viernes». */
export function listInSpanish(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`
}

/** Termina la frase sin duplicar el punto de «a. m.» / «p. m.» (U-19). */
function sentence(text: string): string {
  return text.endsWith('.') ? text : `${text}.`
}

/**
 * Resumen bajo «Tarea a repetir», p. ej.
 * «Se repetirá cada lunes, martes, miércoles y viernes, de 12:00 a. m. a 12:30 a. m.»
 */
export function describeRepeat(
  choice: RepeatChoice,
  days: number[],
  dateWeekday: number,
  start: number,
  end: number,
): string {
  const range = `de ${formatMinutes(start)} a ${formatMinutes(end)}`
  switch (choice) {
    case 'none':
      return ''
    case 'weekly':
      return sentence(`Se repetirá cada ${dayName(dateWeekday)}, ${range}`)
    case 'weekdays':
      return sentence(`Se repetirá de lunes a viernes, ${range}`)
    case 'daily':
      return sentence(`Se repetirá todos los días, ${range}`)
    case 'custom': {
      const names = [...days].sort((a, b) => a - b).map(dayName)
      return names.length ? sentence(`Se repetirá cada ${listInSpanish(names)}, ${range}`) : ''
    }
  }
}

// --- Aviso (RF-034) -----------------------------------------------------------------------------

export const REMINDER_UNITS: { value: ReminderUnit; label: string }[] = [
  { value: 'minutes', label: 'minutos' },
  { value: 'hours', label: 'horas' },
  { value: 'days', label: 'días' },
  { value: 'weeks', label: 'semanas' },
]
export const REMINDER_NUMBERS = Array.from({ length: 60 }, (_, i) => i + 1)
export const DEFAULT_REMINDER = { amount: 15, unit: 'minutes' as ReminderUnit }

const UNIT_SINGULAR: Record<ReminderUnit, string> = {
  minutes: 'minuto',
  hours: 'hora',
  days: 'día',
  weeks: 'semana',
}
const UNIT_MINUTES: Record<ReminderUnit, number> = {
  minutes: 1,
  hours: 60,
  days: 1440,
  weeks: 10080,
}
const MAX_REMINDER_MINUTES = 28 * 1440 // hasta 4 semanas antes

export function reminderTooLong(amount: number, unit: ReminderUnit): boolean {
  return amount * UNIT_MINUTES[unit] > MAX_REMINDER_MINUTES
}

/** «15 minutos», «1 hora», «2 semanas». */
export function reminderPhrase(amount: number, unit: ReminderUnit): string {
  const label = REMINDER_UNITS.find((u) => u.value === unit)?.label ?? ''
  return `${amount} ${amount === 1 ? UNIT_SINGULAR[unit] : label}`
}

/** «Te avisaremos 15 minutos antes de las 12:00 a. m.» */
export function describeReminder(amount: number, unit: ReminderUnit, start: number): string {
  return sentence(
    `Te avisaremos ${reminderPhrase(amount, unit)} antes de las ${formatMinutes(start)}`,
  )
}
