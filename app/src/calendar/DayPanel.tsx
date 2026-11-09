import { TaskCheckbox } from '../components/TaskCheckbox'
import { taskEnd, type Task } from '../tasks/api'
import { addDays, dayStartUtc, formatTimeRange, type LocalDate } from './dates'
import { dayCounts, freeTime } from './freeTime'

interface Props {
  day: LocalDate
  tasks: Task[]
  timezone: string
  onToggle: (id: string, completed: boolean) => Promise<unknown> | void
  onOpenTask: (id: string) => void
}

/** Panel «Tareas del día» de la vista día, con casillas y nota de tiempo libre (RF-027). */
export function DayPanel({ day, tasks, timezone, onToggle, onOpenTask }: Props) {
  const dayStart = dayStartUtc(day, timezone).getTime()
  const dayEnd = dayStartUtc(addDays(day, 1), timezone).getTime()

  const items = tasks
    .map((task) => {
      const start = Math.max(new Date(task.start_at).getTime(), dayStart)
      const end = Math.min(taskEnd(task).getTime(), dayEnd)
      return { task, start: (start - dayStart) / 60_000, end: (end - dayStart) / 60_000 }
    })
    .filter((i) => i.end > i.start)
    .sort((a, b) => a.start - b.start)

  const done = items.filter((i) => i.task.completed).length
  const free = freeTime(items.map((i) => ({ start: i.start, end: i.end })))

  return (
    <aside className="daypanel" aria-label="Tareas del día">
      <div className="daypanel__head">
        <h2>Tareas del día</h2>
        <span className="daypanel__count">{dayCounts(items.length, done)}</span>
      </div>
      <ul className="daypanel__list">
        {items.map(({ task, start, end }) => (
          <li key={task.id} className={`daypanel__item${task.completed ? ' is-done' : ''}`}>
            <TaskCheckbox
              id={`done-${task.id}`}
              completed={task.completed}
              aria-label={`Marcar «${task.title}» como completada`}
              onCompletedChange={(completed) => onToggle(task.id, completed)}
            />
            <button type="button" className="daypanel__text" onClick={() => onOpenTask(task.id)}>
              <strong>{task.title}</strong>
              <span>{formatTimeRange(start, end)}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="daypanel__free">{free.text}</p>
    </aside>
  )
}
