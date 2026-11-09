import type { ReminderUnit } from './api'
import { REMINDER_NUMBERS, REMINDER_UNITS, describeReminder, reminderTooLong } from './timeOptions'

interface Props {
  enabled: boolean
  amount: number
  unit: ReminderUnit
  start: number
  onChange: (next: { enabled: boolean; amount: number; unit: ReminderUnit }) => void
}

/** Casilla «Notificar» con número y unidad de antelación (RF-034). */
export function NotifyField({ enabled, amount, unit, start, onChange }: Props) {
  const tooLong = reminderTooLong(amount, unit)
  return (
    <div className="notify">
      <label className="check">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange({ enabled: e.target.checked, amount, unit })}
        />
        <span>
          <strong>Notificar</strong>
          <small>La notificación se programa en el dispositivo y funciona sin conexión.</small>
        </span>
      </label>

      {enabled && (
        <>
          <div className="notify__row">
            <select
              className="input notify__amount"
              aria-label="Cuánto antes avisar (cantidad)"
              value={amount}
              onChange={(e) => onChange({ enabled, amount: Number(e.target.value), unit })}
            >
              {REMINDER_NUMBERS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <select
              className="input notify__unit"
              aria-label="Cuánto antes avisar (unidad)"
              value={unit}
              onChange={(e) => onChange({ enabled, amount, unit: e.target.value as ReminderUnit })}
            >
              {REMINDER_UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
            <span className="notify__before">antes</span>
          </div>
          {tooLong ? (
            <p className="field__error" role="alert">
              El aviso no puede ser más de 4 semanas antes.
            </p>
          ) : (
            <p className="field__hint" aria-live="polite">
              {describeReminder(amount, unit, start)}
            </p>
          )}
        </>
      )}
    </div>
  )
}
