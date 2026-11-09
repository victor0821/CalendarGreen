/** RF-027 / CA-18: tiempo libre y contadores del panel «Tareas del día». */
import { describe, expect, it } from 'vitest'
import { dayCounts, freeTime } from '../src/calendar/freeTime'

const h = (hours: number, minutes = 0) => hours * 60 + minutes

describe('freeTime', () => {
  it('reproduce el ejemplo del diseño (CA-18)', () => {
    const { text } = freeTime([
      { start: h(10), end: h(11) },
      { start: h(18), end: h(18, 30) },
    ])
    expect(text).toBe(
      'Tu tiempo libre: antes de las 10:00 a. m., de 11:00 a. m. a 6:00 p. m. y después de las 6:30 p. m.',
    )
  })

  it('día sin tareas: todo el día libre', () => {
    expect(freeTime([]).text).toBe('Todo el día libre.')
  })

  it('tarea que empieza a medianoche: no hay «antes de»', () => {
    expect(freeTime([{ start: 0, end: h(9) }]).text).toBe(
      'Tu tiempo libre: después de las 9:00 a. m.',
    )
  })

  it('día completamente ocupado', () => {
    expect(freeTime([{ start: 0, end: 1440 }]).text).toBe('No tienes tiempo libre este día.')
  })

  it('une tareas solapadas o consecutivas', () => {
    const { gaps } = freeTime([
      { start: h(9), end: h(10) },
      { start: h(9, 30), end: h(11) },
      { start: h(11), end: h(12) },
    ])
    expect(gaps).toEqual([
      { start: 0, end: h(9) },
      { start: h(12), end: 1440 },
    ])
  })

  it('recorta lo que sale del día (tarea que cruza la medianoche)', () => {
    const { gaps } = freeTime([{ start: h(23), end: 1440 + h(1) }])
    expect(gaps).toEqual([{ start: 0, end: h(23) }])
  })

  it('una sola tarea en medio da dos huecos', () => {
    expect(freeTime([{ start: h(12), end: h(13) }]).text).toBe(
      'Tu tiempo libre: antes de las 12:00 p. m. y después de las 1:00 p. m.',
    )
  })
})

describe('dayCounts', () => {
  it('singular y plural', () => {
    expect(dayCounts(2, 1)).toBe('2 tareas · 1 hecha')
    expect(dayCounts(1, 0)).toBe('1 tarea · 0 hechas')
    expect(dayCounts(3, 3)).toBe('3 tareas · 3 hechas')
  })
})
