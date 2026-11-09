import type { ReactNode } from 'react'
import { BrandMark } from '../components/icons'
import { ThemeToggle } from '../theme/ThemeToggle'

/** Pantalla dividida de acceso (UX: Iniciar sesión / Crear cuenta). */
export function AuthLayout({ aside, children }: { aside: ReactNode; children: ReactNode }) {
  return (
    <div className="auth">
      <aside className="auth__aside">
        <BrandMark />
        <div className="auth__aside-body">{aside}</div>
        <p className="auth__aside-foot">Gratis y privado: tus tareas solo las ves tú.</p>
      </aside>
      <main className="auth__main">
        <div className="auth__theme">
          <ThemeToggle />
        </div>
        <div className="auth__form">{children}</div>
      </main>
    </div>
  )
}
