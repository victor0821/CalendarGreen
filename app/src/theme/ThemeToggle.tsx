import { useTheme } from './useTheme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const toDark = theme === 'light'
  return (
    <button
      type="button"
      className="btn btn--icon"
      onClick={toggleTheme}
      aria-label={toDark ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
    >
      <span aria-hidden="true">{toDark ? '☾' : '☀'}</span>
    </button>
  )
}
