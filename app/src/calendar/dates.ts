/**
 * Utilidades de fecha del calendario (RF-004…RF-007, RF-012, RF-024). Sin librerías de calendario.
 *
 * Idea central: una «fecha local» (LocalDate) es un día del calendario de la zona horaria del
 * usuario. Los instantes (Date) son absolutos (UTC). Las conversiones usan SIEMPRE la zona IANA
 * con Intl, nunca sumando 24 h fijas, para respetar los cambios de horario.
 */

export interface LocalDate {
  y: number
  m: number // 1-12
  d: number
}

export const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]
export const MONTHS_ABBR = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
]
/** Domingo primero, como Date.getUTCDay(). */
export const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
/** Lunes primero (la semana del diseño empieza en lunes). */
export const WEEKDAYS_SHORT_MON_FIRST = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']

const name = (list: string[], index: number): string => list[index] ?? ''

// --- Fechas locales (calendario puro) ---------------------------------------------------------

export function addDays(date: LocalDate, days: number): LocalDate {
  const t = new Date(Date.UTC(date.y, date.m - 1, date.d + days))
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }
}

/** Suma meses conservando el día cuando existe, o el último día del mes si no (31 ene → 28 feb). */
export function addMonths(date: LocalDate, months: number): LocalDate {
  const total = date.y * 12 + (date.m - 1) + months
  const y = Math.floor(total / 12)
  const m = (total % 12) + 1
  const last = daysInMonth(y, m)
  return { y, m, d: Math.min(date.d, last) }
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

export function dateKey(date: LocalDate): string {
  const p = (n: number, len = 2) => String(n).padStart(len, '0')
  return `${p(date.y, 4)}-${p(date.m)}-${p(date.d)}`
}

/** Convierte «YYYY-MM-DD» en LocalDate; null si no es una fecha real. */
export function parseDateKey(value: string | null | undefined): LocalDate | null {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const date = { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) }
  const check = new Date(Date.UTC(date.y, date.m - 1, date.d))
  const ok =
    check.getUTCFullYear() === date.y &&
    check.getUTCMonth() === date.m - 1 &&
    check.getUTCDate() === date.d
  return ok ? date : null
}

export function sameDate(a: LocalDate, b: LocalDate): boolean {
  return a.y === b.y && a.m === b.m && a.d === b.d
}

export function compareDates(a: LocalDate, b: LocalDate): number {
  return dateKey(a).localeCompare(dateKey(b))
}

/** Días entre a y b (b − a). */
export function diffDays(a: LocalDate, b: LocalDate): number {
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000)
}

/** 0 = lunes … 6 = domingo. */
export function weekdayIndex(date: LocalDate): number {
  const sundayFirst = new Date(Date.UTC(date.y, date.m - 1, date.d)).getUTCDay()
  return (sundayFirst + 6) % 7
}

export function startOfWeek(date: LocalDate): LocalDate {
  return addDays(date, -weekdayIndex(date))
}

export function weekDays(date: LocalDate): LocalDate[] {
  const start = startOfWeek(date)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/** Cuadrícula del mes: del lunes de la semana del día 1 al domingo de la semana del último día. */
export function monthGrid(date: LocalDate): LocalDate[] {
  const first = { y: date.y, m: date.m, d: 1 }
  const last = { y: date.y, m: date.m, d: daysInMonth(date.y, date.m) }
  const start = startOfWeek(first)
  const end = addDays(startOfWeek(last), 6)
  return Array.from({ length: diffDays(start, end) + 1 }, (_, i) => addDays(start, i))
}

// --- Zona horaria ------------------------------------------------------------------------------

const formatters = new Map<string, Intl.DateTimeFormat>()

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    })
    formatters.set(timeZone, f)
  }
  return f
}

interface Zoned extends LocalDate {
  h: number
  mi: number
  s: number
}

function zonedParts(instantMs: number, timeZone: string): Zoned {
  const parts: Record<string, number> = {}
  for (const p of formatterFor(timeZone).formatToParts(new Date(instantMs))) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value)
  }
  return {
    y: parts.year ?? 0,
    m: parts.month ?? 0,
    d: parts.day ?? 0,
    h: (parts.hour ?? 0) % 24,
    mi: parts.minute ?? 0,
    s: parts.second ?? 0,
  }
}

/** Desfase de la zona respecto a UTC en milisegundos, en ese instante. */
function offsetMs(instantMs: number, timeZone: string): number {
  const z = zonedParts(instantMs, timeZone)
  const asUtc = Date.UTC(z.y, z.m - 1, z.d, z.h, z.mi, z.s)
  return asUtc - Math.floor(instantMs / 1000) * 1000
}

/** Instante UTC de «día local + minutos desde las 00:00 locales» en la zona dada. */
export function zonedToUtc(date: LocalDate, minutes: number, timeZone: string): Date {
  const guess = Date.UTC(date.y, date.m - 1, date.d, 0, minutes)
  const first = offsetMs(guess, timeZone)
  let result = guess - first
  const second = offsetMs(result, timeZone)
  if (second !== first) result = guess - second
  return new Date(result)
}

export function dayStartUtc(date: LocalDate, timeZone: string): Date {
  return zonedToUtc(date, 0, timeZone)
}

/** Día local y minutos desde las 00:00 locales de un instante. */
export function toLocal(instant: Date, timeZone: string): { date: LocalDate; minutes: number } {
  const z = zonedParts(instant.getTime(), timeZone)
  return { date: { y: z.y, m: z.m, d: z.d }, minutes: z.h * 60 + z.mi }
}

export function todayIn(timeZone: string, now: Date = new Date()): LocalDate {
  return toLocal(now, timeZone).date
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    formatterFor(timeZone)
    return true
  } catch {
    return false
  }
}

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota'
  } catch {
    return 'America/Bogota'
  }
}

// --- Rangos de consulta --------------------------------------------------------------------------

export interface Range {
  from: Date
  to: Date
}

/** Rango [00:00 del primer día, 00:00 del día siguiente al último) en UTC. */
export function rangeOfDays(first: LocalDate, last: LocalDate, timeZone: string): Range {
  return { from: dayStartUtc(first, timeZone), to: dayStartUtc(addDays(last, 1), timeZone) }
}

// --- Formato en español ----------------------------------------------------------------------------

/** 15:00 → «3:00 p. m.» (determinista; no depende de la versión de ICU del navegador). */
export function formatMinutes(minutes: number): string {
  const total = ((Math.round(minutes) % 1440) + 1440) % 1440
  const h = Math.floor(total / 60)
  const mi = total % 60
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(mi).padStart(2, '0')} ${h < 12 ? 'a. m.' : 'p. m.'}`
}

/** «10:00 – 11:00 a. m.» (si comparten a. m./p. m., se muestra una vez). */
export function formatTimeRange(startMinutes: number, endMinutes: number): string {
  const start = formatMinutes(startMinutes)
  const end = formatMinutes(endMinutes)
  const startPeriod = start.slice(-5)
  const endPeriod = end.slice(-5)
  return startPeriod === endPeriod ? `${start.slice(0, -6)} – ${end}` : `${start} – ${end}`
}

export function formatTime(instant: Date, timeZone: string): string {
  return formatMinutes(toLocal(instant, timeZone).minutes)
}

export function monthTitle(date: LocalDate): string {
  const month = name(MONTHS, date.m - 1)
  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${date.y}`
}

/** «26 oct – 1 nov 2026» (con año en ambos extremos si cruza de año). */
export function weekTitle(date: LocalDate): string {
  const days = weekDays(date)
  const first = days[0] ?? date
  const last = days[6] ?? date
  const f = `${first.d} ${name(MONTHS_ABBR, first.m - 1)}`
  const l = `${last.d} ${name(MONTHS_ABBR, last.m - 1)}`
  return first.y === last.y ? `${f} – ${l} ${last.y}` : `${f} ${first.y} – ${l} ${last.y}`
}

/** «Sábado 31 de octubre 2026». */
export function dayTitle(date: LocalDate): string {
  const weekday = name(WEEKDAYS, new Date(Date.UTC(date.y, date.m - 1, date.d)).getUTCDay())
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${date.d} de ${name(MONTHS, date.m - 1)} ${date.y}`
}

/** «sábado 31 de octubre de 2026». */
export function longDate(date: LocalDate): string {
  const weekday = name(WEEKDAYS, new Date(Date.UTC(date.y, date.m - 1, date.d)).getUTCDay())
  return `${weekday} ${date.d} de ${name(MONTHS, date.m - 1)} de ${date.y}`
}

/** «SÁB 31 OCT» para el rótulo «HOY · …» de la barra lateral. */
export function shortUpperDate(date: LocalDate): string {
  const weekday = name(WEEKDAYS_SHORT_MON_FIRST, weekdayIndex(date))
  return `${weekday} ${date.d} ${name(MONTHS_ABBR, date.m - 1).toUpperCase()}`
}
