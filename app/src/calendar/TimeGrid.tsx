import { useEffect, useRef, type DragEvent, type MouseEvent } from 'react'
import { MicIcon, RepeatIcon } from '../components/icons'
import { taskEnd, type Task } from '../tasks/api'
import {
  WEEKDAYS_SHORT_MON_FIRST,
  addDays,
  dateKey,
  dayStartUtc,
  formatMinutes,
  formatTimeRange,
  sameDate,
  toLocal,
  weekdayIndex,
  zonedToUtc,
  type LocalDate,
} from './dates'
import { hourLabel, taskAriaLabel } from './labels'
import { layoutOverlaps } from './overlap'

/** Alto en px de una hora en la cuadrícula. */
export const HOUR_PX = 48
const FIRST_VISIBLE_HOUR = 6
const SNAP_MINUTES = 15

interface Props {
  days: LocalDate[]
  tasks: Task[]
  timezone: string
  today: LocalDate
  now: Date
  /** Muestra el rango «10:00 – 11:00 a. m.» dentro del bloque (vista día). */
  showRange?: boolean
  onNewTask: (date: LocalDate, minutes: number) => void
  onOpenTask: (id: string) => void
  onMoveTask: (id: string, newStart: Date) => void
}

interface Segment {
  task: Task
  start: number // minutos desde las 00:00 del día
  end: number
}

/** Parte de una tarea que cae dentro de un día (las que cruzan medianoche se parten, RF-008). */
function segmentsForDay(tasks: Task[], day: LocalDate, timezone: string): Segment[] {
  const dayStart = dayStartUtc(day, timezone).getTime()
  const dayEnd = dayStartUtc(addDays(day, 1), timezone).getTime()
  const result: Segment[] = []
  for (const task of tasks) {
    const start = Math.max(new Date(task.start_at).getTime(), dayStart)
    const end = Math.min(taskEnd(task).getTime(), dayEnd)
    if (end > start) {
      result.push({
        task,
        start: (start - dayStart) / 60_000,
        end: (end - dayStart) / 60_000,
      })
    }
  }
  return result
}

/** Cuadrícula por horas de una o varias columnas: vistas semana y día (RF-005, RF-006). */
export function TimeGrid({
  days,
  tasks,
  timezone,
  today,
  now,
  showRange = false,
  onNewTask,
  onOpenTask,
  onMoveTask,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const grabOffset = useRef(0)

  // La cuadrícula cubre las 24 h; al abrir se muestra desde las 6 a. m. (Q-5).
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = FIRST_VISIBLE_HOUR * HOUR_PX
  }, [])

  const nowLocal = toLocal(now, timezone)

  function minutesFromPointer(event: { clientY: number }, column: HTMLElement, offset = 0): number {
    const rect = column.getBoundingClientRect()
    const raw = ((event.clientY - rect.top - offset) / HOUR_PX) * 60
    if (!Number.isFinite(raw)) return 0
    return Math.min(Math.max(raw, 0), 1440 - SNAP_MINUTES)
  }

  function onColumnClick(event: MouseEvent<HTMLDivElement>, day: LocalDate) {
    if (event.target !== event.currentTarget) return // solo el fondo, no las tareas
    const minutes = Math.floor(minutesFromPointer(event, event.currentTarget) / 30) * 30
    onNewTask(day, minutes)
  }

  function onColumnDrop(event: DragEvent<HTMLDivElement>, day: LocalDate) {
    event.preventDefault()
    const task = tasks.find((t) => t.id === event.dataTransfer.getData('text/plain'))
    if (!task) return
    // Semana y día: cambia día y hora, ajustada a intervalos de 15 min (RF-016).
    const raw = minutesFromPointer(event, event.currentTarget, grabOffset.current)
    const minutes = Math.round(raw / SNAP_MINUTES) * SNAP_MINUTES
    const target = zonedToUtc(day, Math.min(minutes, 1440 - SNAP_MINUTES), timezone)
    if (target.getTime() !== new Date(task.start_at).getTime()) onMoveTask(task.id, target)
  }

  return (
    <div className={`timegrid${days.length === 1 ? ' timegrid--day' : ''}`}>
      <div
        className="timegrid__head"
        style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}
      >
        <div />
        {days.map((day) => {
          const isToday = sameDate(day, today)
          return (
            <div key={dateKey(day)} className="timegrid__dayhead">
              {days.length > 1 && (
                <>
                  <span className="timegrid__weekday">
                    {WEEKDAYS_SHORT_MON_FIRST[weekdayIndex(day)]}
                  </span>
                  <span className={`timegrid__daynum${isToday ? ' is-today' : ''}`}>{day.d}</span>
                </>
              )}
            </div>
          )
        })}
      </div>

      <div className="timegrid__scroll" ref={scrollRef}>
        <div
          className="timegrid__body"
          style={{
            height: 24 * HOUR_PX,
            gridTemplateColumns: `56px repeat(${days.length}, 1fr)`,
          }}
        >
          <div className="timegrid__axis" aria-hidden="true">
            {Array.from({ length: 24 }, (_, h) => (
              <span key={h} className="timegrid__hour" style={{ top: h * HOUR_PX }}>
                {hourLabel(h)}
              </span>
            ))}
          </div>

          {days.map((day) => {
            const isToday = sameDate(day, today)
            const segments = segmentsForDay(tasks, day, timezone)
            const placed = layoutOverlaps(
              segments.map((s) => ({ id: s.task.id, start: s.start, end: s.end })),
            )
            return (
              <div
                key={dateKey(day)}
                className={`timegrid__col${isToday ? ' is-today' : ''}`}
                data-date={dateKey(day)}
                role="group"
                aria-label={`Tareas del ${dateKey(day)}`}
                onClick={(e) => onColumnClick(e, day)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onColumnDrop(e, day)}
              >
                {segments.map((segment) => {
                  const p = placed.find((x) => x.id === segment.task.id)
                  const column = p?.column ?? 0
                  const columns = p?.columns ?? 1
                  const height = Math.max(((segment.end - segment.start) / 60) * HOUR_PX - 2, 22)
                  const { task } = segment
                  return (
                    <button
                      key={`${task.id}-${dateKey(day)}`}
                      type="button"
                      draggable
                      className={`block${task.completed ? ' is-done' : ''}`}
                      style={{
                        top: (segment.start / 60) * HOUR_PX,
                        height,
                        left: `calc(${(column / columns) * 100}% + 4px)`,
                        width: `calc(${100 / columns}% - 8px)`,
                      }}
                      aria-label={taskAriaLabel(task, timezone)}
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpenTask(task.id)
                      }}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', task.id)
                        grabOffset.current = e.clientY - e.currentTarget.getBoundingClientRect().top
                      }}
                    >
                      <span className="block__title">
                        {task.source === 'voice' && <MicIcon width={12} height={12} />}
                        {task.series_id && <RepeatIcon width={12} height={12} />}
                        {task.title}
                      </span>
                      <span className="block__time">
                        {showRange
                          ? formatTimeRange(segment.start, segment.end)
                          : formatMinutes(segment.start)}
                      </span>
                    </button>
                  )
                })}
                {isToday && (
                  <div
                    className="nowline"
                    data-testid="now-line"
                    style={{ top: (nowLocal.minutes / 60) * HOUR_PX }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
