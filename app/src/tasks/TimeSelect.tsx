import { Field } from '../components/Field'
import { optionLabel } from './timeOptions'

interface Props {
  id: string
  label: string
  value: number
  options: number[]
  onChange: (minutes: number) => void
  error?: string | null
}

/** Lista desplegable de horas en formato de 12 h con «a. m.» y «p. m.» (RF-028). */
export function TimeSelect({ id, label, value, options, onChange, error }: Props) {
  return (
    <Field id={id} label={label} error={error}>
      <select
        id={id}
        className="input"
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {options.map((minutes) => (
          <option key={minutes} value={minutes}>
            {optionLabel(minutes)}
          </option>
        ))}
      </select>
    </Field>
  )
}
