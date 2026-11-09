import type { ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import {
  BrandMark,
  CalendarIcon,
  LogoutIcon,
  MoonIcon,
  PlusIcon,
  SunIcon,
} from '../components/icons'
import { useTheme } from '../theme/useTheme'
import { TodayList } from './TodayList'

/** Marco de las pantallas con sesión: barra lateral + área principal (RF-001). */
export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const timezone = user?.timezone ?? 'America/Bogota'

  function onLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link
          to="/calendario"
          className="sidebar__brand"
          aria-label="CalendarGreen, ir al calendario"
        >
          <BrandMark />
        </Link>
        <Link to="/tareas/nueva" className="btn btn--primary btn--block">
          <PlusIcon /> Nueva tarea
        </Link>
        <nav aria-label="Principal">
          <NavLink to="/calendario" className="sidebar__link">
            <CalendarIcon /> Calendario
          </NavLink>
        </nav>

        <TodayList timezone={timezone} />

        <div className="sidebar__foot">
          <p className="sidebar__session">
            Sesión iniciada como
            <strong>{user?.email}</strong>
          </p>
          <button type="button" className="link-button" onClick={onLogout}>
            <LogoutIcon width={16} height={16} /> Cerrar sesión
          </button>
          <button type="button" className="btn btn--block" onClick={toggleTheme}>
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          </button>
        </div>
      </aside>
      <main className="shell__main">{children}</main>
    </div>
  )
}
