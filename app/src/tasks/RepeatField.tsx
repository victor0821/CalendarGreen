import { Field } from '../components/Field'
import {
  DAY_CHIPS,
  REPEAT_LABELS,
  REPEAT_ORDER,
  describeRepeat,
  type RepeatChoice,
} from './timeOptions'

interface Props {
  choice: RepeatChoice
  days: number[]
  /** Día de la semana (ISO) de la Fecha elegida: lo usan «Cada semana» y «Personalizado». */
  dateWeekday: number
  start: number
  end: number
  /** En edición la regla no se cambia (RF-033): se muestra pero no se modifica. */
  readOnly?: boolean
  error?: string | null
  onChange: (next: { choice: RepeatChoice; days: number[] }) => void
}

/** «Tarea a repetir»: lista, botones L M X J V S D y resumen (RF-029). */
export function RepeatField({
  choice,
  days,
  dateWeekday,
  start,
  end,
  readOnly = false,
  error,
  onChange,
}: Props) {
  const summary = describeRepeat(choice, days, dateWeekday, start, end)

  function pick(next: RepeatChoice) {
    // Al elegir «Personalizado» queda encendido el día de la Fecha (RF-029).
    const nextDays = next === 'custom' && days.length === 0 ? [dateWeekday] : days
    onChange({ choice: next, days: nextDays })
  }

  function toggle(iso: number) {
    const next = days.includes(iso) ? days.filter((d) => d !== iso) : [...days, iso]
    onChange({ choice, days: next.sort((a, b) => a - b) })
  }

  return (
    <div className="repeat">
      <Field id="repeat" label="Tarea a repetir">
        <select
          id="repeat"
          className="input"
          value={choice}
          disabled={readOnly}
          onChange={(e) => pick(e.target.value as RepeatChoice)}
        >
          {REPEAT_ORDER.map((value) => (
            <option key={value} value={value}>
              {REPEAT_LABELS[value]}
            </option>
          ))}
        </select>
      </Field>

      {choice === 'custom' && (
        <div className="chips" role="group" aria-label="Días de la semana en que se repite">
          {DAY_CHIPS.map(({ iso, letter, name }) => {
            const on = days.includes(iso)
            return (
              <button
                key={iso}
                type="button"
                className={`chip${on ? ' is-on' : ''}`}
                aria-pressed={on}
                aria-label={name}
                disabled={readOnly}
                onClick={() => toggle(iso)}
              >
                {letter}
              </button>
            )
          })}
        </div>
      )}

      {error ? (
        <p className="field__error" role="alert">
          {error}
        </p>
      ) : (
        summary && (
          <p className="field__hint repeat__summary" aria-live="polite">
            {summary}
          </p>
        )
      )}
    </div>
  )
}
