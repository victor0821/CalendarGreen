import { useState, type InputHTMLAttributes } from 'react'

interface Props extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'checked' | 'onChange' | 'type'
> {
  completed: boolean
  /** Guarda el cambio. Si falla, la casilla vuelve sola al valor del servidor. */
  onCompletedChange: (completed: boolean) => Promise<unknown> | void
}

/**
 * Casilla de «completada» que responde al instante.
 * Una casilla controlada vuelve a su valor anterior hasta que llega el estado nuevo; aquí el
 * valor tocado se muestra de inmediato y se descarta cuando el estado real lo alcanza o falla.
 */
export function TaskCheckbox({ completed, onCompletedChange, ...rest }: Props) {
  const [touched, setTouched] = useState<{ value: boolean; base: boolean } | null>(null)
  // El valor tocado solo vale mientras el estado real siga siendo el de antes del clic.
  const checked = touched && touched.base === completed ? touched.value : completed

  return (
    <input
      {...rest}
      type="checkbox"
      checked={checked}
      onChange={(event) => {
        const value = event.target.checked
        setTouched({ value, base: completed })
        Promise.resolve(onCompletedChange(value))
          .catch(() => {})
          .finally(() => setTouched(null))
      }}
    />
  )
}
