import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { browserTimeZone } from '../calendar/dates'
import { Field } from '../components/Field'
import { CheckIcon, ClockIcon } from '../components/icons'
import { useSlowFlag } from '../components/useSlowFlag'
import { AuthLayout } from './AuthLayout'
import { validateEmail, validateNewPassword } from './validation'

function Aside() {
  return (
    <>
      <h1 className="auth__headline">Tu calendario, tu espacio privado.</h1>
      <ul className="auth__checks">
        {[
          'Crea tareas hablando o escribiendo, en español.',
          'Siempre confirmas antes de que algo se guarde.',
          'Recordatorios en tu teléfono Android.',
        ].map((text) => (
          <li key={text}>
            <CheckIcon />
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </>
  )
}

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const timezone = browserTimeZone()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const slow = useSlowFlag(submitting)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return
    const emailProblem = validateEmail(email)
    const passwordProblem = validateNewPassword(password)
    setEmailError(emailProblem)
    setPasswordError(passwordProblem)
    setFormError(null)
    if (emailProblem || passwordProblem) return

    setSubmitting(true)
    try {
      await register(email.trim(), password, timezone)
      navigate('/calendario', { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.code === 'email_already_registered') {
        setEmailError(error.message)
      } else if (error instanceof ApiError && error.code === 'validation_error') {
        setFormError('Revisa tu correo y tu contraseña.')
      } else {
        setFormError(
          error instanceof ApiError ? error.message : 'Algo salió mal. Inténtalo de nuevo.',
        )
      }
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout aside={<Aside />}>
      <h2 className="auth__title">Crea tu cuenta</h2>
      <p className="auth__subtitle">
        Solo necesitas un correo y una contraseña. Entrarás directo a tu calendario.
      </p>

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
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          hint="Usa al menos 8 caracteres."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={passwordError}
        />
        <p className="notice notice--tint">
          <ClockIcon />
          <span>
            Zona horaria detectada: <strong>{timezone}</strong>
          </span>
        </p>
        {formError && (
          <p className="notice notice--error" role="alert">
            {formError}
          </p>
        )}
        <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
          {submitting ? 'Creando tu cuenta…' : 'Crear cuenta y entrar'}
        </button>
        <p className="sr-or-status" role="status" aria-live="polite">
          {slow ? 'Despertando el servidor, un momento…' : ''}
        </p>
      </form>

      <p className="auth__switch">
        ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
      </p>
    </AuthLayout>
  )
}
