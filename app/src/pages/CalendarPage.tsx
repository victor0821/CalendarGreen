import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { CalendarHeader } from '../calendar/CalendarHeader'
import { DayPanel } from '../calendar/DayPanel'
import { MonthView } from '../calendar/MonthView'
import { TimeGrid } from '../calendar/TimeGrid'
import {
  addDays,
  addMonths,
  dateKey,
  dayTitle,
  monthGrid,
  monthTitle,
  parseDateKey,
  rangeOfDays,
  todayIn,
  weekDays,
  weekTitle,
  type LocalDate,
} from '../calendar/dates'
import { AppShell } from '../layout/AppShell'
import { isView, readLastView, writeLastView, type CalendarView } from '../tasks/lastView'
import { useTasksRange, useUpdateTask } from '../tasks/hooks'
import { useNow } from '../tasks/useNow'

const pad = (n: number) => String(n).padStart(2, '0')

export default function CalendarPage() {
  const { user } = useAuth()
  const timezone = user?.timezone ?? 'America/Bogota'
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const now = useNow()
  const today = todayIn(timezone, now)
  const [notice, setNotice] = useState<string | null>(null)

  const viewParam = params.get('vista')
  const view: CalendarView = isView(viewParam) ? viewParam : readLastView()
  const date: LocalDate = parseDateKey(params.get('fecha')) ?? today

  useEffect(() => writeLastView(view), [view])

  const days = view === 'mes' ? monthGrid(date) : view === 'semana' ? weekDays(date) : [date]
  const first = days[0] ?? date
  const last = days[days.length - 1] ?? date
  const range = rangeOfDays(first, last, timezone)

  const query = useTasksRange(range)
  const update = useUpdateTask()
  const tasks = query.data ?? []

  const go = (nextView: CalendarView, nextDate: LocalDate) =>
    setParams({ vista: nextView, fecha: dateKey(nextDate) })

  function shift(direction: 1 | -1) {
    if (view === 'mes') go(view, addMonths(date, direction))
    else go(view, addDays(date, direction * (view === 'semana' ? 7 : 1)))
  }

  function newTask(day: LocalDate, minutes?: number) {
    const query = new URLSearchParams({ fecha: dateKey(day) })
    if (minutes !== undefined) {
      query.set('hora', `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`)
    }
    navigate(`/tareas/nueva?${query.toString()}`)
  }

  function moveTask(id: string, newStart: Date) {
    setNotice(null)
    update.mutate(
      { id, patch: { start_at: newStart.toISOString() } },
      { onError: () => setNotice('No se pudo mover la tarea. Volvió a su lugar.') },
    )
  }

  function toggleTask(id: string, completed: boolean) {
    return update.mutateAsync({ id, patch: { completed } }).catch(() => {
      setNotice('No se pudo actualizar la tarea. Inténtalo de nuevo.')
    })
  }

  const title =
    view === 'mes' ? monthTitle(date) : view === 'semana' ? weekTitle(date) : dayTitle(date)
  const openTask = (id: string) => navigate(`/tareas/${id}/editar`)

  return (
    <AppShell>
      <div className="calendar">
        <CalendarHeader
          title={title}
          view={view}
          onPrev={() => shift(-1)}
          onNext={() => shift(1)}
          onToday={() => go(view, today)}
          onViewChange={(v) => go(v, date)}
        />

        {notice && (
          <p className="notice notice--error" role="alert">
            {notice}
          </p>
        )}
        {query.isPending && (
          <p className="cal-status" role="status">
            Cargando tus tareas…
          </p>
        )}
        {query.isError && (
          <div className="notice notice--error" role="alert">
            <span>No se pudieron cargar tus tareas.</span>{' '}
            <button type="button" className="link-button" onClick={() => query.refetch()}>
              Reintentar
            </button>
          </div>
        )}
        {query.isSuccess && tasks.length === 0 && (
          <p className="cal-status" role="status">
            No tienes tareas en este periodo.
          </p>
        )}

        {view === 'mes' && (
          <MonthView
            date={date}
            tasks={tasks}
            timezone={timezone}
            today={today}
            onOpenDay={(d) => go('dia', d)}
            onNewTask={(d) => newTask(d)}
            onOpenTask={openTask}
            onMoveTask={moveTask}
          />
        )}
        {view === 'semana' && (
          <TimeGrid
            days={days}
            tasks={tasks}
            timezone={timezone}
            today={today}
            now={now}
            onNewTask={newTask}
            onOpenTask={openTask}
            onMoveTask={moveTask}
          />
        )}
        {view === 'dia' && (
          <div className="dayview">
            <TimeGrid
              days={days}
              tasks={tasks}
              timezone={timezone}
              today={today}
              now={now}
              showRange
              onNewTask={newTask}
              onOpenTask={openTask}
              onMoveTask={moveTask}
            />
            <DayPanel
              day={date}
              tasks={tasks}
              timezone={timezone}
              onToggle={toggleTask}
              onOpenTask={openTask}
            />
          </div>
        )}
      </div>
    </AppShell>
  )
}
