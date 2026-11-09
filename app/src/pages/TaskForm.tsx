import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/useAuth'
import {
  addDays,
  dateKey,
  parseDateKey,
  toLocal,
  todayIn,
  weekdayIndex,
  zonedToUtc,
  type LocalDate,
} from '../calendar/dates'
import { Field } from '../components/Field'
import { CheckIcon, ChevronLeftIcon } from '../components/icons'
import { AppShell } from '../layout/AppShell'
import type { DeleteScope, ReminderUnit, Task, TaskInput } from '../tasks/api'
import { useCreateTask, useDeleteTask, useTask, useUpdateTask } from '../tasks/hooks'
import { readLastView } from '../tasks/lastView'
import { NotifyField } from '../tasks/NotifyField'
import { RepeatField } from '../tasks/RepeatField'
import { TimeSelect } from '../tasks/TimeSelect'
import {
  DEFAULT_REMINDER,
  defaultEnd,
  endOptions,
  reminderTooLong,
  shiftEnd,
  startOptions,
  type RepeatChoice,
} from '../tasks/timeOptions'

interface FormValues {
  title: string
  date: string
  start: number // minutos desde las 00:00 locales
  end: number // minutos; 1440 = medianoche
  repeat: RepeatChoice
  repeatDays: number[]
  notes: string
  notify: boolean
  amount: number
  unit: ReminderUnit
  completed: boolean
}

interface Errors {
  title?: string
  date?: string
  end?: string
  repeat?: string
  notes?: string
  notify?: string
}

export function validate(values: FormValues): Errors {
  const errors: Errors = {}
  const title = values.title.trim()
  if (!title) errors.title = 'Escribe un título para la tarea.'
  else if (title.length > 120) errors.title = 'El título admite hasta 120 caracteres.'
  if (!parseDateKey(values.date)) errors.date = 'Elige una fecha válida.'
  if (values.end <= values.start) errors.end = 'La hora final debe ser después de la de inicio.'
  if (values.repeat === 'custom' && values.repeatDays.length === 0) {
    errors.repeat = 'Elige al menos un día.'
  }
  if (values.notes.length > 1000) errors.notes = 'Las notas admiten hasta 1000 caracteres.'
  if (values.notify && reminderTooLong(values.amount, values.unit)) {
    errors.notify = 'El aviso no puede ser más de 4 semanas antes.'
  }
  return errors
}

function nextHour(timezone: string, now = new Date()): { date: LocalDate; minutes: number } {
  const local = toLocal(now, timezone)
  const next = (Math.floor(local.minutes / 60) + 1) * 60
  return next >= 1440
    ? { date: addDays(local.date, 1), minutes: 0 }
    : { date: local.date, minutes: next }
}

function initialValues(
  task: Task | undefined,
  params: URLSearchParams,
  timezone: string,
): FormValues {
  if (task) {
    const local = toLocal(new Date(task.start_at), timezone)
    return {
      title: task.title,
      date: dateKey(local.date),
      start: local.minutes,
      end: local.minutes + task.duration_minutes,
      repeat: task.repeat?.kind ?? 'none',
      repeatDays: task.repeat?.days ?? [],
      notes: task.notes ?? '',
      notify: task.reminder !== null,
      amount: task.reminder?.amount ?? DEFAULT_REMINDER.amount,
      unit: task.reminder?.unit ?? DEFAULT_REMINDER.unit,
      completed: task.completed,
    }
  }
  const suggested = nextHour(timezone)
  const date =
    parseDateKey(params.get('fecha')) ?? (params.get('fecha') ? todayIn(timezone) : suggested.date)
  const hora = /^(\d{2}):(\d{2})$/.exec(params.get('hora') ?? '')
  const start = hora ? Number(hora[1]) * 60 + Number(hora[2]) : suggested.minutes
  return {
    title: '',
    date: dateKey(date),
    start,
    end: defaultEnd(start),
    repeat: 'none',
    repeatDays: [],
    notes: '',
    notify: true,
    amount: DEFAULT_REMINDER.amount,
    unit: DEFAULT_REMINDER.unit,
    completed: false,
  }
}

function TaskFormBody({ task, timezone }: { task?: Task; timezone: string }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [values, setValues] = useState<FormValues>(() => initialValues(task, params, timezone))
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const create = useCreateTask()
  const update = useUpdateTask()
  const remove = useDeleteTask()
  const editing = Boolean(task)
  const repeating = Boolean(task?.series_id)

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  // Al cambiar la hora de inicio, la final se desplaza conservando la duración (RF-028).
  const changeStart = (start: number) =>
    setValues((v) => ({ ...v, start, end: shiftEnd(start, v.end - v.start) }))

  const dateParsed = parseDateKey(values.date)
  const dateWeekday = dateParsed ? weekdayIndex(dateParsed) + 1 : 1

  const backToCalendar = (date: string) =>
    navigate(`/calendario?vista=${readLastView()}&fecha=${date}`)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return // un solo envío (spec 002, casos límite)
    const found = validate(values)
    setErrors(found)
    setFormError(null)
    if (Object.keys(found).length > 0) return

    const day = parseDateKey(values.date)!
    const start = zonedToUtc(day, values.start, timezone).toISOString()
    const duration = values.end - values.start
    const notes = values.notes.trim() ? values.notes : null
    const reminder = values.notify ? { amount: values.amount, unit: values.unit } : null

    setSubmitting(true)
    try {
      if (task) {
        await update.mutateAsync({
          id: task.id,
          patch: {
            title: values.title.trim(),
            start_at: start,
            duration_minutes: duration,
            notes,
            reminder,
            completed: values.completed,
          },
        })
      } else {
        const input: TaskInput = {
          title: values.title.trim(),
          start_at: start,
          duration_minutes: duration,
          notes,
          reminder,
          source: 'manual',
        }
        if (values.repeat !== 'none') {
          input.repeat =
            values.repeat === 'custom'
              ? { kind: 'custom', days: values.repeatDays }
              : { kind: values.repeat }
        }
        await create.mutateAsync(input)
      }
      backToCalendar(values.date)
    } catch (error) {
      setFormError(
        error instanceof ApiError && error.code !== 'validation_error'
          ? error.message
          : 'No se pudo guardar la tarea. Revisa los datos e inténtalo de nuevo.',
      )
      setSubmitting(false)
    }
  }

  async function onDelete(scope: DeleteScope) {
    if (!task) return
    try {
      await remove.mutateAsync({ task, scope })
      backToCalendar(values.date)
    } catch {
      setConfirmingDelete(false)
      setFormError('No se pudo borrar la tarea. Inténtalo de nuevo.')
    }
  }

  return (
    <div className="taskform-page">
      <Link to="/calendario" className="backlink">
        <ChevronLeftIcon width={16} height={16} /> Volver al calendario
      </Link>
      <h1 className="page-title">{editing ? 'Editar tarea' : 'Nueva tarea'}</h1>

      <form className="card taskform" onSubmit={onSubmit} noValidate>
        <Field
          id="title"
          label="Título"
          value={values.title}
          maxLength={200}
          onChange={(e) => set('title', e.target.value)}
          error={errors.title}
        />
        <div className="taskform__row">
          <Field
            id="date"
            label="Fecha"
            type="date"
            value={values.date}
            onChange={(e) => set('date', e.target.value)}
            error={errors.date}
          />
          <TimeSelect
            id="start"
            label="Hora de inicio"
            value={values.start}
            options={startOptions(values.start)}
            onChange={changeStart}
          />
          <TimeSelect
            id="end"
            label="Hora final"
            value={values.end}
            options={endOptions(values.start, values.end)}
            onChange={(end) => set('end', end)}
            error={errors.end}
          />
        </div>

        <RepeatField
          choice={values.repeat}
          days={values.repeatDays}
          dateWeekday={dateWeekday}
          start={values.start}
          end={values.end}
          readOnly={editing}
          error={errors.repeat}
          onChange={({ choice, days }) =>
            setValues((v) => ({ ...v, repeat: choice, repeatDays: days }))
          }
        />
        {repeating && (
          <p className="field__hint">
            Esta tarea es parte de una serie. Los cambios afectan solo a esta repetición.
          </p>
        )}

        <Field id="notes" label="Notas (opcional)" error={errors.notes}>
          <textarea
            id="notes"
            className="input"
            rows={3}
            placeholder="Algo que quieras recordar"
            value={values.notes}
            onChange={(e) => set('notes', e.target.value)}
            aria-invalid={errors.notes ? true : undefined}
          />
        </Field>

        <NotifyField
          enabled={values.notify}
          amount={values.amount}
          unit={values.unit}
          start={values.start}
          onChange={({ enabled, amount, unit }) =>
            setValues((v) => ({ ...v, notify: enabled, amount, unit }))
          }
        />

        {editing && (
          <label className="check">
            <input
              type="checkbox"
              checked={values.completed}
              onChange={(e) => set('completed', e.target.checked)}
            />
            <span>Marcar como completada</span>
          </label>
        )}

        {formError && (
          <p className="notice notice--error" role="alert">
            {formError}
          </p>
        )}

        <div className="taskform__actions">
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            <CheckIcon />{' '}
            {submitting ? 'Guardando…' : editing ? 'Guardar cambios' : 'Guardar tarea'}
          </button>
          <Link to="/calendario" className="link">
            Cancelar
          </Link>
          {editing && !confirmingDelete && (
            <button
              type="button"
              className="btn btn--danger"
              onClick={() => setConfirmingDelete(true)}
            >
              Borrar tarea
            </button>
          )}
        </div>

        {editing && confirmingDelete && (
          <div className="confirm" role="alertdialog" aria-labelledby="confirm-title">
            <p id="confirm-title">
              <strong>¿Borrar esta tarea?</strong>{' '}
              {repeating
                ? 'Elige qué quieres borrar. Esta acción no se puede deshacer.'
                : 'Esta acción no se puede deshacer.'}
            </p>
            <div className="taskform__actions">
              {repeating ? (
                <>
                  <button
                    type="button"
                    className="btn btn--danger"
                    onClick={() => onDelete('this')}
                  >
                    Solo esta
                  </button>
                  <button
                    type="button"
                    className="btn btn--danger"
                    onClick={() => onDelete('following')}
                  >
                    Esta y las siguientes
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn--danger" onClick={() => onDelete('this')}>
                  Sí, borrar
                </button>
              )}
              <button type="button" className="btn" onClick={() => setConfirmingDelete(false)}>
                No, volver
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

export default function TaskForm() {
  const { id } = useParams()
  const { user } = useAuth()
  const timezone = user?.timezone ?? 'America/Bogota'
  const { data: task, isPending, isError } = useTask(id)

  return (
    <AppShell>
      {id && isPending && (
        <p className="cal-status" role="status">
          Cargando la tarea…
        </p>
      )}
      {id && isError && (
        <div className="taskform-page">
          <p className="notice notice--error" role="alert">
            No se encontró la tarea.
          </p>
          <Link to="/calendario" className="backlink">
            <ChevronLeftIcon width={16} height={16} /> Volver al calendario
          </Link>
        </div>
      )}
      {!id && <TaskFormBody timezone={timezone} />}
      {id && task && <TaskFormBody key={task.id} task={task} timezone={timezone} />}
    </AppShell>
  )
}
