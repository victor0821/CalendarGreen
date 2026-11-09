/** Validaciones de formularios (mismas reglas que el servidor; el servidor manda). */

export const MIN_PASSWORD = 8
export const MAX_PASSWORD = 128

export function validateEmail(value: string): string | null {
  const email = value.trim()
  if (!email) return 'Escribe tu correo.'
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Escribe un correo válido, por ejemplo tu@correo.com.'
  }
  return null
}

export function validateNewPassword(value: string): string | null {
  if (value.length < MIN_PASSWORD) return `Usa al menos ${MIN_PASSWORD} caracteres.`
  if (value.length > MAX_PASSWORD) return `Usa como máximo ${MAX_PASSWORD} caracteres.`
  return null
}
