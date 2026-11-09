import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { Field } from '../components/Field'
import { MicIcon } from '../components/icons'
import { useSlowFlag } from '../components/useSlowFlag'
import { AuthLayout } from './AuthLayout'
import { validateEmail } from './validation'

function Aside() {
  return (
    <>
      <h1 className="auth__headline">Dilo en voz alta. CalendarGreen lo agenda.</h1>
      <p className="auth__lead">
        Tu calendario propio: dices qué, cuándo y a qué hora, revisas la propuesta y confirmas con
        un toque.
      </p>
      <div className="auth__demo">
        <div className="auth__demo-say">
          <span className="auth__demo-mic">
            <MicIcon />
          </span>
          <span>«Recuérdame llamar al dentista el viernes a las 3 de la tarde»</span>
        </div>
        <div className="auth__demo-card">
          <span className="auth__demo-tag">PROPUESTA</span>
          <strong>Llamar al dentista</strong>
          <span>viernes 6 de noviembre · 3:00 p. m.</span>
        </div>
      </div>
    </>
  )
}

export default function Login() {
  const { login, sessionExpired } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const slow = useSlowFlag(submitting)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return // evita el envío doble (RF-019)
    const emailProblem = validateEmail(email)
    const passwordProblem = password ? null : 'Escribe tu contraseña.'
    setEmailError(emailProblem)
    setPasswordError(passwordProblem)
    setFormError(null)
    if (emailProblem || passwordProblem) return

    setSubmitting(true)
    try {
      await login(email.trim(), password)
      navigate('/calendario', { replace: true })
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : 'Algo salió mal. Inténtalo de nuevo.',
      )
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout aside={<Aside />}>
      <h2 className="auth__title">Inicia sesión</h2>
      <p className="auth__subtitle">Entra para ver tu calendario y tus tareas.</p>

      {sessionExpired && (
        <p className="notice notice--info" role="status">
          Tu sesión venció. Inicia sesión de nuevo.
        </p>
      )}

      <form onSubmit={onSubmit} noValidate>
        <Field
          id="email"
          label="Correo"
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={emailError}
        />
        <Field
          id="password"
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          placeholder="Tu contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={passwordError}
        />
        {formError && (
          <p className="notice notice--error" role="alert">
            {formError}
          </p>
        )}
        <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
          {submitting ? 'Entrando…' : 'Entrar a mi calendario'}
        </button>
        <p className="sr-or-status" role="status" aria-live="polite">
          {slow ? 'Despertando el servidor, un momento…' : ''}
        </p>
      </form>

      <p className="auth__switch">
        ¿Aún no tienes cuenta? <Link to="/registro">Crear cuenta</Link>
      </p>
    </AuthLayout>
  )
}
