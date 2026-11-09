/** RF-004, RF-005, RF-007, RF-012, RF-024: utilidades de fecha y zona horaria. */
import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMonths,
  dateKey,
  dayStartUtc,
  dayTitle,
  diffDays,
  formatMinutes,
  formatTimeRange,
  monthGrid,
  monthTitle,
  parseDateKey,
  rangeOfDays,
  shortUpperDate,
  startOfWeek,
  toLocal,
  weekDays,
  weekTitle,
  weekdayIndex,
  zonedToUtc,
} from '../src/calendar/dates'

const BOGOTA = 'America/Bogota'
const NY = 'America/New_York'

describe('fechas locales', () => {
  it('suma días cruzando meses y años', () => {
    expect(addDays({ y: 2026, m: 12, d: 31 }, 1)).toEqual({ y: 2027, m: 1, d: 1 })
    expect(addDays({ y: 2026, m: 3, d: 1 }, -1)).toEqual({ y: 2026, m: 2, d: 28 })
  })

  it('febrero bisiesto', () => {
    expect(addDays({ y: 2028, m: 2, d: 28 }, 1)).toEqual({ y: 2028, m: 2, d: 29 })
    expect(addDays({ y: 2027, m: 2, d: 28 }, 1)).toEqual({ y: 2027, m: 3, d: 1 })
  })

  it('suma meses acotando el día al último del mes', () => {
    expect(addMonths({ y: 2026, m: 1, d: 31 }, 1)).toEqual({ y: 2026, m: 2, d: 28 })
    expect(addMonths({ y: 2026, m: 11, d: 15 }, 2)).toEqual({ y: 2027, m: 1, d: 15 })
    expect(addMonths({ y: 2026, m: 1, d: 15 }, -1)).toEqual({ y: 2025, m: 12, d: 15 })
  })

  it('parsea y valida claves de fecha', () => {
    expect(parseDateKey('2026-11-02')).toEqual({ y: 2026, m: 11, d: 2 })
    expect(parseDateKey('2026-02-30')).toBeNull()
    expect(parseDateKey('hola')).toBeNull()
    expect(parseDateKey(null)).toBeNull()
    expect(dateKey({ y: 2026, m: 3, d: 5 })).toBe('2026-03-05')
  })

  it('la semana empieza en lunes (RF-004)', () => {
    expect(weekdayIndex({ y: 2026, m: 10, d: 26 })).toBe(0) // lunes
    expect(weekdayIndex({ y: 2026, m: 11, d: 1 })).toBe(6) // domingo
    expect(startOfWeek({ y: 2026, m: 10, d: 31 })).toEqual({ y: 2026, m: 10, d: 26 })
    expect(weekDays({ y: 2026, m: 10, d: 31 }).map((d) => d.d)).toEqual([26, 27, 28, 29, 30, 31, 1])
  })

  it('diffDays', () => {
    expect(diffDays({ y: 2026, m: 10, d: 26 }, { y: 2026, m: 11, d: 2 })).toBe(7)
  })
})

describe('cuadrícula del mes (CA-1)', () => {
  it('octubre 2026: 5 semanas de lunes a domingo, con días de septiembre y noviembre', () => {
    const grid = monthGrid({ y: 2026, m: 10, d: 31 })
    expect(grid).toHaveLength(35)
    expect(grid[0]).toEqual({ y: 2026, m: 9, d: 28 })
    expect(grid[34]).toEqual({ y: 2026, m: 11, d: 1 })
    expect(weekdayIndex(grid[0]!)).toBe(0)
  })

  it('un mes que ocupa 6 semanas tiene 42 celdas', () => {
    // Marzo 2025 empieza en sábado y termina en lunes 31 → 6 filas
    const grid = monthGrid({ y: 2025, m: 3, d: 10 })
    expect(grid).toHaveLength(42)
    expect(grid[0]).toEqual({ y: 2025, m: 2, d: 24 })
    expect(grid[41]).toEqual({ y: 2025, m: 4, d: 6 })
  })

  it('febrero de 2027 (4 semanas exactas) tiene 28 celdas', () => {
    expect(monthGrid({ y: 2027, m: 2, d: 10 })).toHaveLength(28)
  })

  it('febrero bisiesto 2028', () => {
    const grid = monthGrid({ y: 2028, m: 2, d: 10 })
    expect(grid.some((d) => d.m === 2 && d.d === 29)).toBe(true)
    expect(grid.length % 7).toBe(0)
  })
})

describe('zonas horarias (RF-012, RF-024, CA-13)', () => {
  it('Bogotá es UTC-5: 3:00 p. m. local = 20:00 UTC', () => {
    expect(zonedToUtc({ y: 2026, m: 11, d: 1 }, 15 * 60, BOGOTA).toISOString()).toBe(
      '2026-11-01T20:00:00.000Z',
    )
  })

  it('11:30 p. m. en Bogotá es el día siguiente en UTC pero se ve en su día local', () => {
    const instant = zonedToUtc({ y: 2026, m: 11, d: 3 }, 23 * 60 + 30, BOGOTA)
    expect(instant.toISOString()).toBe('2026-11-04T04:30:00.000Z')
    expect(toLocal(instant, BOGOTA)).toEqual({ date: { y: 2026, m: 11, d: 3 }, minutes: 1410 })
  })

  it('ida y vuelta local ↔ UTC', () => {
    const date = { y: 2026, m: 7, d: 15 }
    for (const tz of [BOGOTA, NY, 'Europe/Madrid', 'Asia/Tokyo']) {
      const back = toLocal(zonedToUtc(date, 9 * 60 + 15, tz), tz)
      expect(back).toEqual({ date, minutes: 9 * 60 + 15 })
    }
  })

  it('el día de cambio de horario en Nueva York dura 23 o 25 horas (no 24 fijas)', () => {
    // 2026-03-08: se adelanta la hora (23 h); 2026-11-01: se atrasa (25 h)
    const spring = rangeOfDays({ y: 2026, m: 3, d: 8 }, { y: 2026, m: 3, d: 8 }, NY)
    const fall = rangeOfDays({ y: 2026, m: 11, d: 1 }, { y: 2026, m: 11, d: 1 }, NY)
    expect((spring.to.getTime() - spring.from.getTime()) / 3_600_000).toBe(23)
    expect((fall.to.getTime() - fall.from.getTime()) / 3_600_000).toBe(25)
  })

  it('después del cambio de horario la hora local se conserva', () => {
    const before = zonedToUtc({ y: 2026, m: 3, d: 7 }, 9 * 60, NY)
    const after = zonedToUtc({ y: 2026, m: 3, d: 9 }, 9 * 60, NY)
    expect(toLocal(before, NY).minutes).toBe(540)
    expect(toLocal(after, NY).minutes).toBe(540)
    expect((after.getTime() - before.getTime()) / 3_600_000).toBe(47) // no 48
  })

  it('dayStartUtc de Bogotá', () => {
    expect(dayStartUtc({ y: 2026, m: 11, d: 1 }, BOGOTA).toISOString()).toBe(
      '2026-11-01T05:00:00.000Z',
    )
  })
})

describe('formato en español (RF-010, RNF-005)', () => {
  it('horas de 12 h con «a. m.» y «p. m.»', () => {
    expect(formatMinutes(0)).toBe('12:00 a. m.')
    expect(formatMinutes(9 * 60)).toBe('9:00 a. m.')
    expect(formatMinutes(12 * 60)).toBe('12:00 p. m.')
    expect(formatMinutes(15 * 60)).toBe('3:00 p. m.')
    expect(formatMinutes(18 * 60 + 30)).toBe('6:30 p. m.')
    expect(formatMinutes(23 * 60 + 59)).toBe('11:59 p. m.')
  })

  it('rangos horarios: se colapsa el periodo repetido', () => {
    expect(formatTimeRange(10 * 60, 11 * 60)).toBe('10:00 – 11:00 a. m.')
    expect(formatTimeRange(18 * 60, 18 * 60 + 30)).toBe('6:00 – 6:30 p. m.')
    expect(formatTimeRange(11 * 60, 13 * 60)).toBe('11:00 a. m. – 1:00 p. m.')
  })

  it('títulos de cada vista (RF-007)', () => {
    expect(monthTitle({ y: 2026, m: 10, d: 31 })).toBe('Octubre 2026')
    expect(weekTitle({ y: 2026, m: 10, d: 31 })).toBe('26 oct – 1 nov 2026')
    expect(weekTitle({ y: 2026, m: 12, d: 30 })).toBe('28 dic 2026 – 3 ene 2027')
    expect(dayTitle({ y: 2026, m: 10, d: 31 })).toBe('Sábado 31 de octubre 2026')
    expect(shortUpperDate({ y: 2026, m: 10, d: 31 })).toBe('SÁB 31 OCT')
  })
})
