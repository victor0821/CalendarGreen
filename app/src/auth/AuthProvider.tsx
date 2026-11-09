import { useQueryClient } from '@tanstack/react-query'
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { ApiError, configureApi } from '../api/client'
import { authApi, type User } from './api'
import { clearToken, readToken, writeToken } from './session'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  status: AuthStatus
  user: User | null
  /** true si la sesión se cerró porque venció (para avisar en /login). */
  sessionExpired: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, timezone: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<AuthStatus>(() => (readToken() ? 'loading' : 'anonymous'))
  const [user, setUser] = useState<User | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false)
  const tokenRef = useRef<string | null>(readToken())

  const endSession = useCallback(
    (expired: boolean) => {
      clearToken()
      tokenRef.current = null
      setUser(null)
      setStatus('anonymous')
      setSessionExpired(expired)
      queryClient.clear() // ninguna tarea de la sesión anterior queda en memoria
    },
    [queryClient],
  )

  // El cliente HTTP lee el token de aquí y avisa si una ruta protegida responde 401 (RF-011).
  useEffect(() => {
    configureApi({ getToken: () => tokenRef.current, onUnauthorized: () => endSession(true) })
  }, [endSession])

  // Al abrir la aplicación se valida la sesión guardada (RF-012).
  useEffect(() => {
    if (!tokenRef.current) return
    let cancelled = false
    authApi
      .me()
      .then((me) => {
        if (cancelled) return
        setUser(me)
        setStatus('authenticated')
      })
      .catch((error: unknown) => {
        if (cancelled) return
        // Solo un 401 invalida la sesión; un fallo de red no debe cerrarla.
        if (error instanceof ApiError && error.status === 401) endSession(true)
        else setStatus('anonymous')
      })
    return () => {
      cancelled = true
    }
  }, [endSession])

  const establish = useCallback((token: string, me: User) => {
    writeToken(token)
    tokenRef.current = token
    setUser(me)
    setSessionExpired(false)
    setStatus('authenticated')
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await authApi.login(email, password)
      establish(response.access_token, response.user)
    },
    [establish],
  )

  const register = useCallback(
    async (email: string, password: string, timezone: string) => {
      const response = await authApi.register(email, password, timezone)
      establish(response.access_token, response.user)
    },
    [establish],
  )

  const logout = useCallback(() => endSession(false), [endSession])

  const value = useMemo(
    () => ({ status, user, sessionExpired, login, register, logout }),
    [status, user, sessionExpired, login, register, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
