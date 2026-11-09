/** Spec 001 — RF-001…RF-020 / CA-1…CA-16: pantallas de acceso, sesión y rutas protegidas. */
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readToken } from '../src/auth/session'
import { installFakeApi, type FakeApi } from './fakeApi'
import { renderApp } from './renderApp'

let api: FakeApi

beforeEach(() => {
  api = installFakeApi()
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const location = () => screen.getByTestId('location').textContent
const typeInto = async (label: string, text: string) =>
  userEvent.type(screen.getByLabelText(label), text)

describe('pantalla /login (RF-017)', () => {
  it('muestra el diseño: título, campos, botón y enlace a crear cuenta', () => {
    renderApp('/login')
    expect(screen.getByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument()
    expect(screen.getByLabelText('Correo')).toHaveAttribute('placeholder', 'tu@correo.com')
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar a mi calendario' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '/registro')
    expect(screen.getByText(/Dilo en voz alta/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /modo oscuro/i })).toBeInTheDocument()
  })

  it('valida los campos antes de enviar y no llama al servidor (RF-018, CA-15)', async () => {
    renderApp('/login')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar a mi calendario' }))
    expect(screen.getByText('Escribe tu correo.')).toBeInTheDocument()
    expect(screen.getByText('Escribe tu contraseña.')).toBeInTheDocument()

    await typeInto('Correo', 'no-es-correo')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar a mi calendario' }))
    expect(screen.getByText(/Escribe un correo válido/)).toBeInTheDocument()
    expect(screen.getByLabelText('Correo')).toHaveAttribute('aria-invalid', 'true')
    expect(api.calls).toHaveLength(0)
  })

  it('credenciales incorrectas: mensaje genérico (CA-7)', async () => {
    api.addUser()
    renderApp('/login')
    await typeInto('Correo', 'ana@correo.com')
    await typeInto('Contraseña', 'incorrecta-123')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar a mi calendario' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.')
    expect(location()).toBe('/login')
  })

  it('inicia sesión y entra al calendario (CA-6)', async () => {
    api.addUser()
    renderApp('/login')
    await typeInto('Correo', 'ana@correo.com')
    await typeInto('Contraseña', 'una-contraseña-segura')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar a mi calendario' }))
    await waitFor(() => expect(location()).toMatch(/^\/calendario/))
    expect(await screen.findByText('ana@correo.com')).toBeInTheDocument()
    expect(readToken()).toBeTruthy()
  })

  it('no permite enviar dos veces mientras se procesa (CA-16)', async () => {
    api.addUser()
    renderApp('/login')
    await typeInto('Correo', 'ana@correo.com')
    await typeInto('Contraseña', 'una-contraseña-segura')
    const button = screen.getByRole('button', { name: 'Entrar a mi calendario' })
    await userEvent.dblClick(button)
    await waitFor(() => expect(location()).toMatch(/^\/calendario/))
    expect(api.calls.filter((c) => c.path === '/auth/login')).toHaveLength(1)
  })

  it('muestra el aviso de demasiados intentos con su mensaje (RF-009)', async () => {
    api.failNext('POST /auth/login', 429, 'too_many_attempts')
    renderApp('/login')
    await typeInto('Correo', 'ana@correo.com')
    await typeInto('Contraseña', 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar a mi calendario' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('sin conexión muestra un mensaje claro y conserva lo escrito', async () => {
    api.networkDown = true
    renderApp('/login')
    await typeInto('Correo', 'ana@correo.com')
    await typeInto('Contraseña', 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar a mi calendario' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo conectar con el servidor',
    )
    expect(screen.getByLabelText('Correo')).toHaveValue('ana@correo.com')
  })
})

describe('pantalla /registro (RF-001…RF-006, RF-017)', () => {
  it('muestra el diseño: ayuda de contraseña y zona horaria detectada', () => {
    renderApp('/registro')
    expect(screen.getByRole('heading', { name: 'Crea tu cuenta' })).toBeInTheDocument()
    expect(screen.getByText('Usa al menos 8 caracteres.')).toBeInTheDocument()
    expect(screen.getByText(/Zona horaria detectada:/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear cuenta y entrar' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Inicia sesión' })).toHaveAttribute('href', '/login')
  })

  it('rechaza una contraseña corta junto al campo (CA-4)', async () => {
    renderApp('/registro')
    await typeInto('Correo', 'ana@correo.com')
    await typeInto('Contraseña', '1234567')
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta y entrar' }))
    expect(screen.getByText('Usa al menos 8 caracteres.')).toHaveAttribute('role', 'alert')
    expect(api.calls).toHaveLength(0)
  })

  it('crea la cuenta, envía la zona horaria y entra directo al calendario (CA-1, CA-5)', async () => {
    renderApp('/registro')
    await typeInto('Correo', '  Ana@Correo.com ')
    await typeInto('Contraseña', 'una-contraseña-segura')
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta y entrar' }))
    await waitFor(() => expect(location()).toMatch(/^\/calendario/))
    const call = api.calls.find((c) => c.path === '/auth/register')
    expect(call?.body).toMatchObject({ email: 'Ana@Correo.com', timezone: expect.any(String) })
    expect(api.users).toHaveLength(1)
    expect(api.users[0]?.email).toBe('ana@correo.com')
  })

  it('correo repetido: error junto al campo de correo (CA-3)', async () => {
    api.addUser('ana@correo.com')
    renderApp('/registro')
    await typeInto('Correo', 'ana@correo.com')
    await typeInto('Contraseña', 'una-contraseña-segura')
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta y entrar' }))
    expect(await screen.findByText(/Ese correo ya tiene una cuenta/)).toBeInTheDocument()
    expect(screen.getByLabelText('Correo')).toHaveAttribute('aria-invalid', 'true')
    expect(location()).toBe('/registro')
  })
})

describe('rutas protegidas y sesión (RF-010…RF-014)', () => {
  it('un visitante que abre /calendario termina en /login (CA-13)', async () => {
    renderApp('/calendario')
    await waitFor(() => expect(location()).toBe('/login'))
  })

  it('un visitante no puede abrir el formulario de tareas (RF-014)', async () => {
    renderApp('/tareas/nueva')
    await waitFor(() => expect(location()).toBe('/login'))
  })

  it('un usuario con sesión que abre /login o /registro termina en /calendario (CA-13)', async () => {
    const user = api.addUser()
    renderApp('/registro', { api, user })
    await waitFor(() => expect(location()).toMatch(/^\/calendario/))
  })

  it('al reabrir la app con una sesión válida no pide credenciales (CA-11)', async () => {
    const user = api.addUser()
    renderApp('/', { api, user })
    await waitFor(() => expect(location()).toMatch(/^\/calendario/))
    expect(await screen.findByText('ana@correo.com')).toBeInTheDocument()
  })

  it('una sesión vencida lleva a /login con aviso (CA-10)', async () => {
    const user = api.addUser()
    renderApp('/calendario', { api, user })
    await screen.findByText('ana@correo.com')
    api.users.length = 0 // el servidor ya no reconoce el token
    api.failNext('GET /tasks', 401, 'unauthorized')
    // Ir al mes siguiente pide un rango nuevo: esa petición recibe el 401.
    await userEvent.click(screen.getByRole('button', { name: /mes siguiente/ }))
    await waitFor(() => expect(location()).toBe('/login'))
    expect(screen.getByText('Tu sesión venció. Inicia sesión de nuevo.')).toBeInTheDocument()
    expect(readToken()).toBeNull()
  })

  it('un token inválido guardado al abrir lleva a /login con aviso (RF-012, CA-10)', async () => {
    api.addUser()
    renderApp('/calendario', { token: 'token-viejo' })
    await waitFor(() => expect(location()).toBe('/login'))
    expect(screen.getByText('Tu sesión venció. Inicia sesión de nuevo.')).toBeInTheDocument()
    expect(readToken()).toBeNull()
  })

  it('cerrar sesión lleva a /login y descarta el token (CA-9)', async () => {
    const user = api.addUser()
    renderApp('/calendario', { api, user })
    await screen.findByText('ana@correo.com')
    await userEvent.click(screen.getByRole('button', { name: /Cerrar sesión/ }))
    await waitFor(() => expect(location()).toBe('/login'))
    expect(readToken()).toBeNull()
    expect(window.localStorage.getItem('calendargreen-token')).toBeNull()
  })

  it('funciona aunque el almacenamiento del navegador esté bloqueado (Q-12)', async () => {
    api.addUser()
    renderApp('/login')
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    await typeInto('Correo', 'ana@correo.com')
    await typeInto('Contraseña', 'una-contraseña-segura')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar a mi calendario' }))
    await waitFor(() => expect(location()).toMatch(/^\/calendario/))
  })
})
