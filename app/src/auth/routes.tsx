import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'

function LoadingScreen() {
  const [slow, setSlow] = useState(false)
  // El servidor gratuito puede estar durmiendo: pasado un umbral se avisa (RF-019).
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 3000)
    return () => window.clearTimeout(timer)
  }, [])
  return (
    <main className="loading-screen" role="status" aria-live="polite">
      <p>{slow ? 'Despertando el servidor, un momento…' : 'Cargando…'}</p>
    </main>
  )
}

/** Solo con sesión válida (RF-014): si no, a /login. */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  if (status === 'loading') return <LoadingScreen />
  if (status === 'anonymous') return <Navigate to="/login" replace />
  return children
}

/** Solo sin sesión (login y registro): con sesión válida, a /calendario. */
export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  if (status === 'loading') return <LoadingScreen />
  if (status === 'authenticated') return <Navigate to="/calendario" replace />
  return children
}

export function HomeRedirect() {
  const { status } = useAuth()
  if (status === 'loading') return <LoadingScreen />
  return <Navigate to={status === 'authenticated' ? '/calendario' : '/login'} replace />
}
