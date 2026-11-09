export interface Slot {
  id: string
  start: number // minutos desde las 00:00 del día
  end: number
}

export interface Placed extends Slot {
  column: number
  columns: number // columnas del grupo de solapamiento al que pertenece
}

/**
 * Reparte el ancho entre tareas que coinciden en el tiempo (RF-011, Q-6: columnas lado a lado).
 * Agrupa por conflicto y asigna a cada tarea la primera columna libre de su grupo.
 */
export function layoutOverlaps(slots: Slot[]): Placed[] {
  const sorted = [...slots].sort((a, b) => a.start - b.start || b.end - a.end)
  const result: Placed[] = []
  let group: Placed[] = []
  let columnEnds: number[] = []
  let groupEnd = -Infinity

  const closeGroup = () => {
    const columns = columnEnds.length
    for (const item of group) item.columns = columns
    result.push(...group)
    group = []
    columnEnds = []
  }

  for (const slot of sorted) {
    if (group.length > 0 && slot.start >= groupEnd) closeGroup()
    let column = columnEnds.findIndex((end) => end <= slot.start)
    if (column === -1) {
      column = columnEnds.length
      columnEnds.push(slot.end)
    } else {
      columnEnds[column] = slot.end
    }
    group.push({ ...slot, column, columns: 1 })
    groupEnd = Math.max(groupEnd, slot.end)
  }
  if (group.length > 0) closeGroup()
  return result
}
