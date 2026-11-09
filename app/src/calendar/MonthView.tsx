import { useRef, type DragEvent, type KeyboardEvent } from 'react'
import { MicIcon, RepeatIcon } from '../components/icons'
import type { Task } from '../tasks/api'
import {
  WEEKDAYS_SHORT_MON_FIRST,
  dateKey,
  longDate,
  monthGrid,
  sameDate,
  toLocal,
  zonedToUtc,
  formatMinutes,
  type LocalDate,
} from './dates'
import { taskAriaLabel } from './labels'

/** Máximo de tareas visibles por celda; el resto se resume como «+N más» (RF-004). */
export const MAX_PER_CELL = 2

interface Props {
  date: LocalDate
  tasks: Task[]
  timezone: string
  today: LocalDate
  onOpenDay: (date: LocalDate) => void
  onNewTask: (date: LocalDate) => void
  onOpenTask: (id: string) => void
  onMoveTask: (id: string, newStart: Date) => void
}

export function MonthView({
  date,
  tasks,
  timezone,
  today,
  onOpenDay,
  onNewTask,
  onOpenTask,
  onMoveTask,
}: Props) {
  const gridRef = useRef<HTMLDivElement>(null)
  const days = monthGrid(date)

  const byDay = new Map<string, Task[]>()
  for (const task of tasks) {
    const key = dateKey(toLocal(new Date(task.start_at), timezone).date)
    byDay.set(key, [...(byDay.get(key) ?? []), task])
  }

  function onDrop(event: DragEvent, day: LocalDate) {
    event.preventDefault()
    const task = tasks.find((t) => t.id === event.dataTransfer.getData('text/plain'))
    if (!task) return
    // Mes: cambia el día y conserva la hora (RF-016).
    const minutes = toLocal(new Date(task.start_at), timezone).minutes
    const target = zonedToUtc(day, minutes, timezone)
    if (target.getTime() !== new Date(task.start_at).getTime()) onMoveTask(task.id, target)
  }

  // Flechas para moverse entre días con el teclado (RF-026).
  function onKeyDown(event: KeyboardEvent) {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key]
    if (step === undefined) return
    const buttons = Array.from(
      gridRef.current?.querySelectorAll<HTMLButtonElement>('[data-day-button]') ?? [],
    )
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (index === -1) return
    event.preventDefault()
    buttons[Math.min(Math.max(index + step, 0), buttons.length - 1)]?.focus()
  }

  return (
    <div
      className="month"
      role="grid"
      aria-label="Calendario del mes"
      ref={gridRef}
      onKeyDown={onKeyDown}
    >
      <div className="month__head" role="row">
        {WEEKDAYS_SHORT_MON_FIRST.map((name) => (
          <div key={name} className="month__weekday" role="columnheader">
            {name}
          </div>
        ))}
      </div>
      <div className="month__body">
        {days.map((day) => {
          const key = dateKey(day)
          const list = byDay.get(key) ?? []
          const visible = list.slice(0, MAX_PER_CELL)
          const hidden = list.length - visible.length
          const isToday = sameDate(day, today)
          const outside = day.m !== date.m
          return (
            <div
              key={key}
              role="gridcell"
              data-date={key}
              className={`month__cell${isToday ? ' is-today' : ''}${outside ? ' is-outside' : ''}`}
              onClick={() => onNewTask(day)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDrop(e, day)}
            >
              <button
                type="button"
                data-day-button
                className={`month__daynum${isToday ? ' is-today' : ''}`}
                aria-label={`Ver el día ${longDate(day)}`}
                aria-current={isToday ? 'date' : undefined}
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenDay(day)
                }}
              >
                {day.d}
              </button>
              {visible.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  draggable
                  className={`pill${task.completed ? ' is-done' : ''}`}
                  aria-label={taskAriaLabel(task, timezone)}
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenTask(task.id)
                  }}
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', task.id)}
                >
                  {task.source === 'voice' && <MicIcon width={12} height={12} />}
                  {task.series_id && <RepeatIcon width={12} height={12} />}
                  <span className="pill__time">
                    {formatMinutes(toLocal(new Date(task.start_at), timezone).minutes)}
                  </span>
                  <span className="pill__title">{task.title}</span>
                </button>
              ))}
              {hidden > 0 && (
                <button
                  type="button"
                  className="month__more"
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenDay(day)
                  }}
                >
                  +{hidden} más
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
