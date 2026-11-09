import { ChevronLeftIcon, ChevronRightIcon } from '../components/icons'
import type { CalendarView } from '../tasks/lastView'

const VIEWS: { id: CalendarView; label: string }[] = [
  { id: 'mes', label: 'Mes' },
  { id: 'semana', label: 'Semana' },
  { id: 'dia', label: 'Día' },
]

interface Props {
  title: string
  view: CalendarView
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onViewChange: (view: CalendarView) => void
}

/** Título del rango, anterior/siguiente, «Hoy» y conmutador de vista (RF-007). */
export function CalendarHeader({ title, view, onPrev, onNext, onToday, onViewChange }: Props) {
  const label = view === 'mes' ? 'mes' : view === 'semana' ? 'semana' : 'día'
  return (
    <header className="cal-header">
      <h1 className="cal-header__title">{title}</h1>
      <div className="cal-header__nav">
        <button
          type="button"
          className="btn btn--icon"
          onClick={onPrev}
          aria-label={`Ir al ${label} anterior`}
        >
          <ChevronLeftIcon />
        </button>
        <button
          type="button"
          className="btn btn--icon"
          onClick={onNext}
          aria-label={`Ir al ${label} siguiente`}
        >
          <ChevronRightIcon />
        </button>
        <button type="button" className="btn btn--pill" onClick={onToday}>
          Hoy
        </button>
      </div>
      <div className="segmented" role="group" aria-label="Vista del calendario">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            className={`segmented__btn${view === v.id ? ' is-active' : ''}`}
            aria-pressed={view === v.id}
            onClick={() => onViewChange(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>
    </header>
  )
}
