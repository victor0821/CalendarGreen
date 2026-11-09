import { TaskCheckbox } from '../components/TaskCheckbox'
import { addDays, formatTime, rangeOfDays, shortUpperDate, todayIn } from '../calendar/dates'
import { useUpdateTask, useTasksRange } from '../tasks/hooks'
import { useNow } from '../tasks/useNow'

/** Lista «HOY · SÁB 31 OCT» de la barra lateral, con casillas para completar (RF-002). */
export function TodayList({ timezone }: { timezone: string }) {
  const now = useNow()
  const today = todayIn(timezone, now)
  const range = rangeOfDays(today, addDays(today, 0), timezone)
  const { data: tasks, isError } = useTasksRange(range)
  const update = useUpdateTask()

  return (
    <section className="today" aria-labelledby="today-title">
      <h2 id="today-title" className="today__title">
        HOY · {shortUpperDate(today)}
      </h2>
      {isError && <p className="today__empty">No se pudieron cargar tus tareas.</p>}
      {tasks && tasks.length === 0 && <p className="today__empty">No tienes tareas hoy.</p>}
      <ul className="today__list">
        {(tasks ?? []).map((task) => (
          <li key={task.id}>
            <label className={`today__item${task.completed ? ' is-done' : ''}`}>
              <TaskCheckbox
                completed={task.completed}
                onCompletedChange={(completed) =>
                  update.mutateAsync({ id: task.id, patch: { completed } })
                }
              />
              <span>
                <strong>{formatTime(new Date(task.start_at), timezone)}</strong> {task.title}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  )
}
