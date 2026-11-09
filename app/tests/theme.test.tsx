/** RF-011 / CA-11: el tema alterna, se recuerda y funciona sin almacenamiento. */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { THEME_STORAGE_KEY } from '../src/theme/theme'
import { ThemeProvider } from '../src/theme/ThemeProvider'
import { ThemeToggle } from '../src/theme/ThemeToggle'

function setSystemDark(dark: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: dark && query.includes('dark'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
}

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  )
}

describe('tema claro/oscuro', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    setSystemDark(false)
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('arranca en claro por defecto y alterna con el botón (CA-11)', async () => {
    renderToggle()
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    await userEvent.click(screen.getByRole('button', { name: 'Cambiar a modo oscuro' }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(screen.getByRole('button', { name: 'Cambiar a modo claro' })).toBeInTheDocument()
  })

  it('persiste la elección y la recupera al recargar (CA-11)', async () => {
    const first = renderToggle()
    await userEvent.click(screen.getByRole('button'))
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    first.unmount()
    document.documentElement.removeAttribute('data-theme')

    renderToggle()
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })

  it('usa la preferencia del sistema si no hay elección guardada', () => {
    setSystemDark(true)
    renderToggle()
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })

  it('funciona aunque localStorage lance errores', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    renderToggle()
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    await userEvent.click(screen.getByRole('button'))
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })

  it('el botón de solo ícono tiene nombre accesible', () => {
    renderToggle()
    expect(screen.getByRole('button', { name: /modo oscuro/i })).toBeInTheDocument()
  })
})
