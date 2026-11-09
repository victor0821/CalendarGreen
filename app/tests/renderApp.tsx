import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import App from '../src/App'
import { AuthProvider } from '../src/auth/AuthProvider'
import { clearToken, writeToken } from '../src/auth/session'
import { ThemeProvider } from '../src/theme/ThemeProvider'
import type { FakeApi, FakeUser } from './fakeApi'

/** Hace visible la ruta actual para las pruebas. */
function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname + location.search}</div>
}

/** Renderiza la app completa, con rutas, sesión y caché nuevas. `user` inicia sesión de antemano. */
export function renderApp(
  route: string,
  options: { api?: FakeApi; user?: FakeUser; token?: string } = {},
) {
  clearToken()
  window.localStorage.clear()
  if (options.user && options.api) writeToken(options.api.tokenFor(options.user))
  if (options.token) writeToken(options.token)

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>
          <AuthProvider>
            <App />
            <LocationProbe />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  )
}
