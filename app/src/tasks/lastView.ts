export type CalendarView = 'mes' | 'semana' | 'dia'

const KEY = 'calendargreen-view'

export function isView(value: string | null): value is CalendarView {
  return value === 'mes' || value === 'semana' || value === 'dia'
}

/** Última vista usada (conveniencia por navegador; si falla el almacenamiento, vista mes). */
export function readLastView(): CalendarView {
  try {
    const value = window.localStorage.getItem(KEY)
    return isView(value) ? value : 'mes'
  } catch {
    return 'mes'
  }
}

export function writeLastView(view: CalendarView): void {
  try {
    window.localStorage.setItem(KEY, view)
  } catch {
    // Sin almacenamiento: no se recuerda.
  }
}
