/** Spec 002 — vistas mes, semana y día, formulario, edición, borrado y arrastre (CA-1…CA-18). */
import { createEvent, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installFakeApi, type FakeApi, type FakeUser } from './fakeApi'
import { renderApp } from './renderApp'

// «Hoy» en los diseños: sábado 31 de octubre de 2026, 1:00 p. m. en Bogotá (UTC-5).
const NOW = new Date('2026-10-31T18:00:00Z')

let api: FakeApi
let ana: FakeUser

/** Datos del diseño: informe (hecha) y llamar a mamá hoy, tres tareas el 28 y un almuerzo el 1 nov. */
function seedDesign() {
  api.seed(ana, {
    title: 'Revisar informe',
    start_at: '2026-10-31T15:00:00Z', // 10:00 a. m.
    duration_minutes: 60,
    completed: true,
    completed_at: '2026-10-31T16:00:00Z',
  })
  api.seed(ana, { title: 'Llamar a mamá', start_at: '2026-10-31T23:00:00Z' }) // 6:00 p. m.
  api.seed(ana, {
    title: 'Gimnasio',
    start_at: '2026-10-28T11:00:00Z', // 6:00 a. m.
    duration_minutes: 60,
    completed: true,
  })
  api.seed(ana, {
    title: 'Comprar mercado',
    start_at: '2026-10-28T22:00:00Z', // 5:00 p. m.
    duration_minutes: 60,
    source: 'voice',
  })
  api.seed(ana, {
    title: 'Estudiar inglés',
    start_at: '2026-10-29T00:00:00Z', // 7:00 p. m. del 28
    duration_minutes: 60,
  })
  api.seed(ana, {
    title: 'Almuerzo familiar',
    start_at: '2026-11-01T18:00:00Z', // 1:00 p. m. del 1 nov
    duration_minutes: 120,
  })
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: NOW })
  api = installFakeApi()
  ana = api.addUser()
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const location = () => screen.getByTestId('location').textContent
const cell = (key: string) =>
  document.querySelector<HTMLElement>(`[data-date="${key}"][role="gridcell"]`)!
const column = (key: string) =>
  document.querySelector<HTMLElement>(`.timegrid__col[data-date="${key}"]`)!
/** Renderiza la app con sesión iniciada y espera a que cargue la barra lateral. */
async function open(route: string) {
  renderApp(route, { api, user: ana })
  await screen.findByText(ana.email)
}
const patchCalls = () => api.calls.filter((c) => c.method === 'PATCH')

function dragData(id: string) {
  return { dataTransfer: { setData: vi.fn(), getData: () => id } }
}

describe('vista mes (RF-004, RF-007)', () => {
  it('muestra Octubre 2026 con semanas de lunes a domingo y hoy resaltado (CA-1)', async () => {
    seedDesign()
    await open('/calendario?vista=mes')
    expect(await screen.findByRole('heading', { name: 'Octubre 2026' })).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'LUN',
      'MAR',
      'MIÉ',
      'JUE',
      'VIE',
      'SÁB',
      'DOM',
    ])
    expect(screen.getAllByRole('gridcell')).toHaveLength(35)
    expect(document.querySelector('[role="gridcell"]')?.getAttribute('data-date')).toBe(
      '2026-09-28',
    )
    expect(cell('2026-09-30')).toHaveClass('is-outside')
    expect(cell('2026-11-01')).toHaveClass('is-outside')
    expect(cell('2026-10-31')).toHaveClass('is-today')
    expect(
      within(cell('2026-10-31')).getByRole('button', { name: /Ver el día sábado 31/ }),
    ).toHaveAttribute('aria-current', 'date')
  })

  it('máximo 2 tareas por celda y «+1 más» (CA-2)', async () => {
    seedDesign()
    await open('/calendario?vista=mes')
    const day28 = cell('2026-10-28')
    await within(day28).findByRole('button', { name: /Gimnasio/ })
    expect(within(day28).getAllByRole('button', { name: /, / })).toHaveLength(2)
    expect(within(day28).getByRole('button', { name: '+1 más' })).toBeInTheDocument()
    expect(within(day28).queryByRole('button', { name: /Estudiar inglés/ })).toBeNull()
  })

  it('«+1 más» abre el detalle del día (Q-5)', async () => {
    seedDesign()
    await open('/calendario?vista=mes')
    await userEvent.click(await within(cell('2026-10-28')).findByRole('button', { name: '+1 más' }))
    expect(location()).toBe('/calendario?vista=dia&fecha=2026-10-28')
    expect(
      await screen.findByRole('heading', { name: 'Miércoles 28 de octubre 2026' }),
    ).toBeInTheDocument()
  })

  it('tareas completadas tachadas, las de voz con ícono y horas en 12 h (RF-010, CA-14)', async () => {
    seedDesign()
    await open('/calendario?vista=mes')
    const informe = await within(cell('2026-10-31')).findByRole('button', {
      name: /Revisar informe.*completada/,
    })
    expect(informe).toHaveClass('is-done')
    expect(informe).toHaveTextContent('10:00 a. m.')
    const mercado = within(cell('2026-10-28')).getByRole('button', { name: /Comprar mercado/ })
    expect(mercado).toHaveAccessibleName(/creada por voz/)
    expect(mercado.querySelector('svg')).not.toBeNull()
    expect(mercado).toHaveTextContent('5:00 p. m.')
  })

  it('las flechas del teclado mueven el foco entre días (RF-026)', async () => {
    await open('/calendario?vista=mes')
    await screen.findByRole('heading', { name: 'Octubre 2026' })
    const a = within(cell('2026-10-30')).getByRole('button', { name: /Ver el día/ })
    a.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(within(cell('2026-10-31')).getByRole('button', { name: /Ver el día/ })).toHaveFocus()
    await userEvent.keyboard('{ArrowUp}')
    expect(within(cell('2026-10-24')).getByRole('button', { name: /Ver el día/ })).toHaveFocus()
  })

  it('un calendario sin tareas se ve normal y lo indica (RF-009)', async () => {
    await open('/calendario?vista=mes')
    expect(await screen.findByText('No tienes tareas en este periodo.')).toBeInTheDocument()
    expect(screen.getAllByRole('gridcell')).toHaveLength(35)
  })

  it('si falla la carga muestra el error y permite reintentar (CA-16)', async () => {
    seedDesign()
    api.failNext('GET /tasks', 500)
    api.failNext('GET /tasks', 500)
    await open('/calendario?vista=mes')
    const retry = await screen.findByRole('button', { name: 'Reintentar' })
    expect(screen.getAllByText(/No se pudieron cargar tus tareas/).length).toBeGreaterThan(0)
    await userEvent.click(retry)
    expect(
      await within(cell('2026-10-31')).findByRole('button', { name: /Llamar a mamá/ }),
    ).toBeInTheDocument()
  })
})

describe('navegación (RF-007, CA-4)', () => {
  it('anterior, siguiente, Hoy y conmutador conservan la fecha de referencia', async () => {
    await open('/calendario?vista=mes')
    await screen.findByRole('heading', { name: 'Octubre 2026' })

    await userEvent.click(screen.getByRole('button', { name: 'Ir al mes siguiente' }))
    expect(await screen.findByRole('heading', { name: 'Noviembre 2026' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Ir al mes anterior' }))
    await userEvent.click(screen.getByRole('button', { name: 'Ir al mes anterior' }))
    expect(await screen.findByRole('heading', { name: 'Septiembre 2026' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Hoy' }))
    expect(await screen.findByRole('heading', { name: 'Octubre 2026' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Semana' }))
    expect(await screen.findByRole('heading', { name: '26 oct – 1 nov 2026' })).toBeInTheDocument()
    expect(location()).toBe('/calendario?vista=semana&fecha=2026-10-31')
    await userEvent.click(screen.getByRole('button', { name: 'Ir al semana anterior' }))
    expect(await screen.findByRole('heading', { name: '19 oct – 25 oct 2026' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Día' }))
    expect(
      await screen.findByRole('heading', { name: 'Sábado 24 de octubre 2026' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Día' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Mes' })).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(screen.getByRole('button', { name: 'Mes' }))
    expect(await screen.findByRole('heading', { name: 'Octubre 2026' })).toBeInTheDocument()
  })

  it('recuerda la última vista usada (conveniencia del navegador)', async () => {
    await open('/calendario?vista=semana')
    await screen.findByRole('heading', { name: '26 oct – 1 nov 2026' })
    expect(window.localStorage.getItem('calendargreen-view')).toBe('semana')
  })
})

describe('barra lateral y lista «Hoy» (RF-001, RF-002, RF-017)', () => {
  it('muestra la sesión, las tareas de hoy y permite completarlas (CA-10)', async () => {
    seedDesign()
    await open('/calendario?vista=mes')
    expect(await screen.findByText('HOY · SÁB 31 OCT')).toBeInTheDocument()
    expect(screen.getByText('ana@correo.com')).toBeInTheDocument()
    const informe = await screen.findByRole('checkbox', { name: /10:00 a. m. Revisar informe/ })
    const mama = await screen.findByRole('checkbox', { name: /6:00 p. m. Llamar a mamá/ })
    expect(informe).toBeChecked()
    expect(mama).not.toBeChecked()

    await userEvent.click(mama)
    await waitFor(() => expect(patchCalls()).toHaveLength(1))
    expect(patchCalls()[0]?.body).toEqual({ completed: true })
    expect(
      await within(cell('2026-10-31')).findByRole('button', { name: /Llamar a mamá.*completada/ }),
    ).toHaveClass('is-done')

    await userEvent.click(mama) // reabrir
    await waitFor(() => expect(patchCalls()).toHaveLength(2))
    expect(patchCalls()[1]?.body).toEqual({ completed: false })
  })

  it('«Modo oscuro» alterna el tema (RF-025)', async () => {
    await open('/calendario?vista=mes')
    await screen.findByRole('heading', { name: 'Octubre 2026' })
    await userEvent.click(screen.getByRole('button', { name: 'Modo oscuro' }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(screen.getByRole('button', { name: 'Modo claro' })).toBeInTheDocument()
  })
})

describe('vista semana (RF-005, RF-011)', () => {
  it('el bloque ocupa su duración y hoy tiene la línea de la hora actual (CA-3)', async () => {
    seedDesign()
    await open('/calendario?vista=semana')
    const almuerzo = await screen.findByRole('button', { name: /Almuerzo familiar/ })
    expect(almuerzo).toHaveStyle({ height: '94px', top: '624px' }) // 2 h × 48 px − 2; 13:00 × 48 px
    expect(column('2026-11-01')).toContainElement(almuerzo)
    expect(column('2026-10-31')).toHaveClass('is-today')
    expect(within(column('2026-10-31')).getByTestId('now-line')).toHaveStyle({ top: '624px' })
    expect(screen.queryAllByTestId('now-line')).toHaveLength(1)
    expect(screen.getAllByText('LUN')).toHaveLength(1)
  })

  it('una tarea que cruza la medianoche aparece en los dos días (CA-5)', async () => {
    api.seed(ana, {
      title: 'Turno de noche',
      start_at: '2026-10-31T04:30:00Z', // 11:30 p. m. del 30
      duration_minutes: 60,
    })
    await open('/calendario?vista=semana')
    await screen.findAllByRole('button', { name: /Turno de noche/ })
    const first = within(column('2026-10-30')).getByRole('button', { name: /Turno de noche/ })
    const second = within(column('2026-10-31')).getByRole('button', { name: /Turno de noche/ })
    expect(first).toHaveStyle({ top: `${23.5 * 48}px`, height: '22px' }) // hasta medianoche (30 min)
    expect(second).toHaveStyle({ top: '0px' })
  })

  it('tareas simultáneas se reparten el ancho sin taparse (RF-011)', async () => {
    api.seed(ana, { title: 'Reunión A', start_at: '2026-10-27T14:00:00Z', duration_minutes: 60 })
    api.seed(ana, { title: 'Reunión B', start_at: '2026-10-27T14:00:00Z', duration_minutes: 60 })
    await open('/calendario?vista=semana')
    const a = await screen.findByRole('button', { name: /Reunión A/ })
    const b = screen.getByRole('button', { name: /Reunión B/ })
    expect(a.style.width).toBe('calc(50% - 8px)')
    expect(b.style.width).toBe('calc(50% - 8px)')
    expect(a.style.left).not.toBe(b.style.left)
  })

  it('clic en un hueco abre «Nueva tarea» con esa fecha y hora (RF-014)', async () => {
    await open('/calendario?vista=semana')
    await screen.findByRole('heading', { name: '26 oct – 1 nov 2026' })
    fireEvent.click(column('2026-10-29'), { clientY: 10 * 48 + 5 }) // 10:00 a. m.
    expect(location()).toBe('/tareas/nueva?fecha=2026-10-29&hora=10%3A00')
    expect(await screen.findByLabelText('Fecha')).toHaveValue('2026-10-29')
    expect(screen.getByLabelText('Hora de inicio')).toHaveValue(String(10 * 60))
    expect(screen.getByLabelText('Hora final')).toHaveValue(String(10 * 60 + 30))
  })
})

describe('vista día (RF-006, RF-027, CA-18)', () => {
  it('reproduce el diseño: bloques con rango, panel, conteo y tiempo libre', async () => {
    seedDesign()
    await open('/calendario?vista=dia&fecha=2026-10-31')
    expect(
      await screen.findByRole('heading', { name: 'Sábado 31 de octubre 2026' }),
    ).toBeInTheDocument()

    const informe = await screen.findByRole('button', { name: /Revisar informe.*completada/ })
    expect(informe).toHaveTextContent('10:00 – 11:00 a. m.')
    expect(informe).toHaveClass('is-done')
    expect(screen.getByRole('button', { name: /Llamar a mamá, / })).toHaveTextContent(
      '6:00 – 6:30 p. m.',
    )

    const panel = screen.getByRole('complementary', { name: 'Tareas del día' })
    expect(within(panel).getByRole('heading', { name: 'Tareas del día' })).toBeInTheDocument()
    expect(within(panel).getByText('2 tareas · 1 hecha')).toBeInTheDocument()
    expect(within(panel).getByRole('checkbox', { name: /Revisar informe/ })).toBeChecked()
    expect(within(panel).getByRole('checkbox', { name: /Llamar a mamá/ })).not.toBeChecked()
    expect(
      within(panel).getByText(
        'Tu tiempo libre: antes de las 10:00 a. m., de 11:00 a. m. a 6:00 p. m. y después de las 6:30 p. m.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByTestId('now-line')).toBeInTheDocument()

    await userEvent.click(within(panel).getByRole('checkbox', { name: /Llamar a mamá/ }))
    expect(await within(panel).findByText('2 tareas · 2 hechas')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /Llamar a mamá.*completada/ })).toHaveClass(
      'is-done',
    )
  })

  it('un día sin tareas está libre todo el día', async () => {
    await open('/calendario?vista=dia&fecha=2026-10-20')
    expect(await screen.findByText('Todo el día libre.')).toBeInTheDocument()
    expect(screen.getByText('0 tareas · 0 hechas')).toBeInTheDocument()
    expect(screen.queryByTestId('now-line')).toBeNull() // no es hoy
  })
})

describe('crear tarea (RF-013, RF-014, RF-021)', () => {
  it('abre con los valores iniciales: hoy, próxima hora, 30 minutos y aviso (RF-014)', async () => {
    await open('/tareas/nueva')
    expect(await screen.findByRole('heading', { name: 'Nueva tarea' })).toBeInTheDocument()
    expect(screen.getByLabelText('Fecha')).toHaveValue('2026-10-31')
    expect(screen.getByLabelText('Hora de inicio')).toHaveValue(String(14 * 60)) // 2:00 p. m.
    expect(screen.getByLabelText('Hora final')).toHaveValue(String(14 * 60 + 30)) // 2:30 p. m.
    expect(screen.queryByLabelText('Duración')).toBeNull() // ya no existe (RF-028)
    expect(screen.getByLabelText('Tarea a repetir')).toHaveValue('none')
    expect(screen.getByRole('checkbox', { name: /Notificar/ })).toBeChecked()
    expect(screen.getByLabelText(/cantidad/)).toHaveValue('15')
    expect(screen.getByLabelText(/unidad/)).toHaveValue('minutes')
    expect(screen.getByRole('link', { name: /Volver al calendario/ })).toHaveAttribute(
      'href',
      '/calendario',
    )
    expect(screen.getByRole('link', { name: 'Cancelar' })).toBeInTheDocument()
  })

  it('guarda la tarea en UTC, con 30 minutos y origen manual, y vuelve al calendario (CA-6)', async () => {
    await open('/calendario?vista=mes')
    await userEvent.click(await screen.findByRole('link', { name: /Nueva tarea/ }))
    await userEvent.type(await screen.findByLabelText('Título'), 'Llamar a mi hermano')
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-11-05' } })
    await userEvent.selectOptions(screen.getByLabelText('Hora de inicio'), String(15 * 60))
    expect(screen.getByLabelText('Hora final')).toHaveValue(String(15 * 60 + 30)) // 3:30 p. m.
    await userEvent.click(screen.getByRole('button', { name: 'Guardar tarea' }))

    await waitFor(() => expect(location()).toBe('/calendario?vista=mes&fecha=2026-11-05'))
    const post = api.calls.find((c) => c.method === 'POST' && c.path === '/tasks')
    expect(post?.body).toEqual({
      title: 'Llamar a mi hermano',
      start_at: '2026-11-05T20:00:00.000Z', // 3:00 p. m. en Bogotá
      duration_minutes: 30,
      notes: null,
      reminder: { amount: 15, unit: 'minutes' },
      source: 'manual',
    })
    expect(await screen.findByRole('heading', { name: 'Noviembre 2026' })).toBeInTheDocument()
    expect(
      await within(cell('2026-11-05')).findByRole('button', { name: /Llamar a mi hermano/ }),
    ).toBeInTheDocument()
  })

  it('el título es obligatorio y no se crea nada sin él (CA-7)', async () => {
    await open('/tareas/nueva')
    await userEvent.type(await screen.findByLabelText('Título'), '    ')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar tarea' }))
    expect(screen.getByText('Escribe un título para la tarea.')).toBeInTheDocument()
    expect(screen.getByLabelText('Título')).toHaveAttribute('aria-invalid', 'true')
    expect(api.calls.filter((c) => c.method === 'POST')).toHaveLength(0)
  })

  it('valida el largo del título y de las notas', async () => {
    await open('/tareas/nueva')
    await userEvent.type(await screen.findByLabelText('Título'), 'x'.repeat(121))
    fireEvent.change(screen.getByLabelText('Notas (opcional)'), {
      target: { value: 'n'.repeat(1001) },
    })
    await userEvent.click(screen.getByRole('button', { name: 'Guardar tarea' }))
    expect(screen.getByText('El título admite hasta 120 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('Las notas admiten hasta 1000 caracteres.')).toBeInTheDocument()
    expect(api.calls.filter((c) => c.method === 'POST')).toHaveLength(0)
  })

  it('no envía dos veces con doble clic', async () => {
    await open('/tareas/nueva')
    await userEvent.type(await screen.findByLabelText('Título'), 'Una sola vez')
    await userEvent.dblClick(screen.getByRole('button', { name: 'Guardar tarea' }))
    await waitFor(() => expect(location()).toMatch(/^\/calendario/))
    expect(api.calls.filter((c) => c.method === 'POST')).toHaveLength(1)
  })

  it('«Cancelar» vuelve sin guardar', async () => {
    await open('/tareas/nueva')
    await userEvent.type(await screen.findByLabelText('Título'), 'No guardar')
    await userEvent.click(screen.getByRole('link', { name: 'Cancelar' }))
    await waitFor(() => expect(location()).toMatch(/^\/calendario/))
    expect(api.tasks).toHaveLength(0)
  })

  it('si el servidor falla, conserva lo escrito y avisa', async () => {
    api.failNext('POST /tasks', 500)
    await open('/tareas/nueva')
    await userEvent.type(await screen.findByLabelText('Título'), 'Reintentar luego')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar tarea' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByLabelText('Título')).toHaveValue('Reintentar luego')
    expect(location()).toBe('/tareas/nueva')
  })
})

describe('editar y borrar (RF-015, RF-018)', () => {
  it('edita una tarea existente y conserva su origen (CA-8)', async () => {
    seedDesign()
    await open('/calendario?vista=mes')
    await userEvent.click(
      await within(cell('2026-10-28')).findByRole('button', { name: /Comprar mercado/ }),
    )
    expect(await screen.findByRole('heading', { name: 'Editar tarea' })).toBeInTheDocument()
    expect(screen.getByLabelText('Título')).toHaveValue('Comprar mercado')
    expect(screen.getByLabelText('Fecha')).toHaveValue('2026-10-28')
    expect(screen.getByLabelText('Hora de inicio')).toHaveValue(String(17 * 60)) // 5:00 p. m.
    expect(screen.getByLabelText('Hora final')).toHaveValue(String(18 * 60)) // 6:00 p. m.

    await userEvent.clear(screen.getByLabelText('Título'))
    await userEvent.type(screen.getByLabelText('Título'), 'Comprar frutas')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(location()).toMatch(/^\/calendario/))
    expect(patchCalls()[0]?.body).toMatchObject({
      title: 'Comprar frutas',
      start_at: '2026-10-28T22:00:00.000Z',
    })
    expect(api.tasks.find((t) => t.title === 'Comprar frutas')?.source).toBe('voice')
  })

  it('borrar pide confirmación y luego elimina de todas las vistas (CA-11)', async () => {
    seedDesign()
    await open('/calendario?vista=mes')
    await userEvent.click(
      await within(cell('2026-10-31')).findByRole('button', { name: /Llamar a mamá/ }),
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Borrar tarea' }))

    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveTextContent('¿Borrar esta tarea?')
    await userEvent.click(within(dialog).getByRole('button', { name: 'No, volver' }))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(api.calls.filter((c) => c.method === 'DELETE')).toHaveLength(0)

    await userEvent.click(screen.getByRole('button', { name: 'Borrar tarea' }))
    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Sí, borrar' }),
    )
    await waitFor(() => expect(location()).toMatch(/^\/calendario/))
    expect(api.tasks.some((t) => t.title === 'Llamar a mamá')).toBe(false)
    await screen.findByRole('heading', { name: 'Octubre 2026' })
    expect(screen.queryByRole('button', { name: /Llamar a mamá/ })).toBeNull()
    expect(screen.queryByRole('checkbox', { name: /Llamar a mamá/ })).toBeNull()
  })

  it('una tarea inexistente muestra «No se encontró la tarea.»', async () => {
    await open('/tareas/00000000-0000-4000-8000-999999999999/editar')
    expect(await screen.findByText('No se encontró la tarea.')).toBeInTheDocument()
  })
})

describe('mover arrastrando (RF-016, CA-9)', () => {
  it('mes: cambia el día y conserva la hora', async () => {
    seedDesign()
    await open('/calendario?vista=mes')
    const mama = await within(cell('2026-10-31')).findByRole('button', { name: /Llamar a mamá/ })
    const id = api.tasks.find((t) => t.title === 'Llamar a mamá')!.id
    fireEvent.dragStart(mama, dragData(id))
    fireEvent.drop(cell('2026-10-29'), dragData(id))
    await waitFor(() => expect(patchCalls()).toHaveLength(1))
    expect(patchCalls()[0]?.body).toEqual({ start_at: '2026-10-29T23:00:00.000Z' }) // 6:00 p. m. Bogotá
    expect(
      await within(cell('2026-10-29')).findByRole('button', { name: /Llamar a mamá/ }),
    ).toBeInTheDocument()
    expect(within(cell('2026-10-31')).queryByRole('button', { name: /Llamar a mamá/ })).toBeNull()
  })

  it('si el guardado falla, vuelve a su lugar y avisa', async () => {
    seedDesign()
    await open('/calendario?vista=mes')
    await within(cell('2026-10-31')).findByRole('button', { name: /Llamar a mamá/ })
    const id = api.tasks.find((t) => t.title === 'Llamar a mamá')!.id
    api.failNext('PATCH /tasks', 500)
    fireEvent.drop(cell('2026-10-29'), dragData(id))
    expect(
      await screen.findByText('No se pudo mover la tarea. Volvió a su lugar.'),
    ).toBeInTheDocument()
    expect(
      await within(cell('2026-10-31')).findByRole('button', { name: /Llamar a mamá/ }),
    ).toBeInTheDocument()
    expect(within(cell('2026-10-29')).queryByRole('button', { name: /Llamar a mamá/ })).toBeNull()
    expect(api.tasks.find((t) => t.id === id)?.start_at).toBe('2026-10-31T23:00:00Z')
  })

  it('semana: cambia día y hora, ajustada a 15 minutos', async () => {
    seedDesign()
    await open('/calendario?vista=semana')
    await screen.findByRole('button', { name: /Llamar a mamá/ })
    const id = api.tasks.find((t) => t.title === 'Llamar a mamá')!.id
    // 3:07 p. m. del jueves 29 → se ajusta a 3:00 p. m. (jsdom no tiene DragEvent: clientY se define a mano)
    const drop = createEvent.drop(column('2026-10-29'), dragData(id))
    Object.defineProperty(drop, 'clientY', { value: (15 * 60 + 7) * (48 / 60) })
    fireEvent(column('2026-10-29'), drop)
    await waitFor(() => expect(patchCalls()).toHaveLength(1))
    expect(patchCalls()[0]?.body).toEqual({ start_at: '2026-10-29T20:00:00.000Z' })
  })

  it('soltar en el mismo lugar no hace nada', async () => {
    seedDesign()
    await open('/calendario?vista=mes')
    await within(cell('2026-10-31')).findByRole('button', { name: /Llamar a mamá/ })
    const id = api.tasks.find((t) => t.title === 'Llamar a mamá')!.id
    fireEvent.drop(cell('2026-10-31'), dragData(id))
    expect(patchCalls()).toHaveLength(0)
  })
})

describe('aislamiento entre usuarios en la interfaz (RF-023)', () => {
  it('no se ven las tareas de otro usuario', async () => {
    const beto = api.addUser('beto@correo.com')
    api.seed(beto, { title: 'Secreto de Beto', start_at: '2026-10-31T15:00:00Z' })
    api.seed(ana, { title: 'Tarea de Ana', start_at: '2026-10-31T16:00:00Z' })
    await open('/calendario?vista=mes')
    expect(
      await within(cell('2026-10-31')).findByRole('button', { name: /Tarea de Ana/ }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Secreto de Beto/)).toBeNull()
  })

  it('no se puede editar la tarea de otro usuario', async () => {
    const beto = api.addUser('beto@correo.com')
    const ajena = api.seed(beto, { title: 'Secreto de Beto', start_at: '2026-10-31T15:00:00Z' })
    await open(`/tareas/${ajena.id}/editar`)
    expect(await screen.findByText('No se encontró la tarea.')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Secreto de Beto')).toBeNull()
  })
})
