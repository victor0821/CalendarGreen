export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'calendargreen-theme'

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark'
}

/** Lee la preferencia guardada; null si no hay o el almacenamiento no está disponible (RF-011). */
export function readStoredTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isTheme(value) ? value : null
  } catch {
    return null
  }
}

export function storeTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Sin almacenamiento (modo privado, bloqueado): la interfaz sigue funcionando sin recordar.
  }
}

export function systemTheme(): Theme {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function initialTheme(): Theme {
  return readStoredTheme() ?? systemTheme()
}
