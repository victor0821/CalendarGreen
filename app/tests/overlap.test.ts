/** RF-011: reparto de ancho entre tareas simultáneas. */
import { describe, expect, it } from 'vitest'
import { layoutOverlaps } from '../src/calendar/overlap'

const slot = (id: string, start: number, end: number) => ({ id, start, end })
const byId = (placed: ReturnType<typeof layoutOverlaps>) =>
  Object.fromEntries(placed.map((p) => [p.id, [p.column, p.columns]]))

describe('layoutOverlaps', () => {
  it('tareas sin conflicto ocupan todo el ancho', () => {
    const placed = layoutOverlaps([slot('a', 0, 60), slot('b', 60, 120)])
    expect(byId(placed)).toEqual({ a: [0, 1], b: [0, 1] })
  })

  it('dos tareas con la misma hora se reparten el ancho', () => {
    const placed = layoutOverlaps([slot('a', 600, 660), slot('b', 600, 660)])
    expect(byId(placed)).toEqual({ a: [0, 2], b: [1, 2] })
  })

  it('solapamiento parcial', () => {
    const placed = layoutOverlaps([slot('a', 600, 700), slot('b', 650, 720)])
    expect(byId(placed)).toEqual({ a: [0, 2], b: [1, 2] })
  })

  it('reutiliza columnas libres dentro del mismo grupo', () => {
    const placed = layoutOverlaps([slot('a', 0, 120), slot('b', 30, 60), slot('c', 70, 100)])
    expect(byId(placed)).toEqual({ a: [0, 2], b: [1, 2], c: [1, 2] })
  })

  it('grupos independientes no comparten columnas', () => {
    const placed = layoutOverlaps([slot('a', 0, 60), slot('b', 0, 60), slot('c', 300, 360)])
    expect(byId(placed)).toEqual({ a: [0, 2], b: [1, 2], c: [0, 1] })
  })

  it('lista vacía', () => {
    expect(layoutOverlaps([])).toEqual([])
  })
})
