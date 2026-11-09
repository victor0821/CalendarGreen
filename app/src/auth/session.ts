/**
 * Almacenamiento del token de sesión (spec 001, Q-1 opción A): localStorage en web.
 * Si el almacenamiento no está disponible (modo privado), la sesión dura lo que la pestaña,
 * guardada en memoria (Q-12). Todo acceso va en try/catch.
 */

const TOKEN_KEY = 'calendargreen-token'
let memoryToken: string | null = null

export function readToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY) ?? memoryToken
  } catch {
    return memoryToken
  }
}

export function writeToken(token: string): void {
  memoryToken = token
  try {
    window.localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // Sin almacenamiento: queda solo en memoria.
  }
}

export function clearToken(): void {
  memoryToken = null
  try {
    window.localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Nada que limpiar.
  }
}
