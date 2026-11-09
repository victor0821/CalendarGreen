import { useEffect, useState } from 'react'

/** true cuando `active` lleva más de `ms` milisegundos encendido (p. ej. «despertando servidor»). */
export function useSlowFlag(active: boolean, ms = 3000): boolean {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    if (!active) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- se reinicia al terminar la espera
      setSlow(false)
      return
    }
    const timer = window.setTimeout(() => setSlow(true), ms)
    return () => window.clearTimeout(timer)
  }, [active, ms])
  return slow
}
