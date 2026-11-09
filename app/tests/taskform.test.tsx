/** Enmienda v2 — formulario: horas, repetición y notificar; series en las vistas (CA-19…CA-27). */
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installFakeApi, type FakeApi, type FakeUser } from './fakeApi'
import { renderApp } from './renderApp'

// «Hoy»: sábado 31 de octubre de 2026, 1:00 p. m. en Bogotá → la hora sugerida es 2:00 p. m.
const NOW = new Date('2026-10-31T18:00:00Z')
const h = (hours: number, minutes = 0) => String(hours * 60 + minutes)

let api: FakeApi
let ana: FakeUser

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
async function open(route: string) {
  renderApp(route, { api, user: ana })
  await screen.findByText(ana.email)
}
const select = (label: string) => screen.getByLabelText(label) as HTMLSelectElement
const optionTexts = (label: string) =>
  within(select(label))
    .getAllByRole('option')
    .map((o) => o.textContent)
const chip = (name: string) => screen.getByRole('button', { name })
const posts = () => api.calls.filter((c) => c.method === 'POST' && c.path === '/tasks')

describe('horas de inicio y final (RF-028)', () => {
  it('son listas desplegables de 12 h cada 30 minutos (CA-19)', async () => {
    await open('/tareas/nueva')
    const start = optionTexts('Hora de inicio')
    expect(start).toHaveLength(48)
    expect(start[0]).toBe('12:00 a. m.')
    expect(start[47]).toBe('11:30 p. m.')
    expect(select('Hora de inicio').tagName).toBe('SELECT')
    expect(select('Hora final').tagName).toBe('SELECT')

    await userEvent.selectOptions(select('Hora de inicio'), h(15))
    const end = optionTexts('Hora final')
    expect(end[0]).toBe('3:30 p. m.')
    expect(end[end.length - 1]).toBe('12:00 a. m.')
    expect(select('Hora final')).toHaveValue(h(15, 30))
  })

  it('al cambiar el inicio, la final conserva la duración (CA-20)', async () => {
    await open('/tareas/nueva')
    await userEvent.selectOptions(select('Hora de inicio'), h(15))
    await userEvent.selectOptions(select('Hora final'), h(16, 30))
    await userEvent.selectOptions(select('Hora de inicio'), h(17))
    expect(select('Hora final')).toHaveValue(h(18, 30))

    await userEvent.selectOptions(select('Hora de inicio'), h(23, 30))
    expect(optionTexts('Hora final')).toEqual(['12:00 a. m.'])
    expect(select('Hora final')).toHaveValue('1440')
  })

  it('guarda la duración como hora final menos hora de inicio', async () => {
    await open('/tareas/nueva')
    await userEvent.type(screen.getByLabelText('Título'), 'Reunión larga')
    await userEvent.selectOptions(select('Hora de inicio'), h(9))
    await userEvent.selectOptions(select('Hora final'), h(11, 30))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar tarea' }))
    await waitFor(() => expect(posts()).toHaveLength(1))
    expect(posts()[0]?.body).toMatchObject({ duration_minutes: 150 })
  })

  it('al editar, una hora fuera de la cuadrícula se conserva en las listas', async () => {
    const task = api.seed(ana, {
      title: 'Por voz',
      start_at: '2026-11-03T20:10:00Z', // 3:10 p. m.
      duration_minutes: 25, // termina 3:35 p. m.
    })
    await open(`/tareas/${task.id}/editar`)
    await screen.findByRole('heading', { name: 'Editar tarea' })
    expect(optionTexts('Hora de inicio')).toContain('3:10 p. m.')
    expect(optionTexts('Hora final')).toContain('3:35 p. m.')
    expect(select('Hora de inicio')).toHaveValue(h(15, 10))
    expect(select('Hora final')).toHaveValue(h(15, 35))
  })

  it('una tarea que termina después de la medianoche no pierde su hora final', async () => {
    const task = api.seed(ana, {
      title: 'Turno',
      start_at: '2026-11-04T04:00:00Z', // 11:00 p. m. del 3
      duration_minutes: 120,
    })
    await open(`/tareas/${task.id}/editar`)
    await screen.findByRole('heading', { name: 'Editar tarea' })
    expect(optionTexts('Hora final')).toContain('1:00 a. m. (día siguiente)')
    expect(select('Hora final')).toHaveValue(h(25))
  })
})

describe('«Tarea a repetir» (RF-029, RF-030)', () => {
  it('ofrece las cinco opciones y por defecto no se repite', async () => {
    await open('/tareas/nueva')
    expect(optionTexts('Tarea a repetir')).toEqual([
      'No se repite',
      'Cada semana',
      'De lunes a viernes',
      'Todos los días',
      'Personalizado',
    ])
    expect(select('Tarea a repetir')).toHaveValue('none')
    expect(screen.queryByRole('group', { name: /Días de la semana/ })).toBeNull()
    expect(screen.queryByText(/Se repetirá/)).toBeNull()
  })

  it('«Personalizado» muestra L M X J V S D con el día de la fecha encendido (CA-21)', async () => {
    await open('/tareas/nueva') // hoy es sábado
    await userEvent.selectOptions(select('Tarea a repetir'), 'custom')
    const group = screen.getByRole('group', { name: /Días de la semana/ })
    expect(
      within(group)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['L', 'M', 'X', 'J', 'V', 'S', 'D'])
    expect(chip('sábado')).toHaveAttribute('aria-pressed', 'true')
    expect(chip('lunes')).toHaveAttribute('aria-pressed', 'false')
  })

  it('reproduce el diseño: L, M, X y V de 12:00 a. m. a 12:30 a. m. (CA-21)', async () => {
    await open('/tareas/nueva')
    await userEvent.selectOptions(select('Hora de inicio'), '0')
    await userEvent.selectOptions(select('Tarea a repetir'), 'custom')
    for (const day of ['lunes', 'martes', 'miércoles', 'viernes']) await userEvent.click(chip(day))
    await userEvent.click(chip('sábado')) // se apaga el del día de la fecha
    expect(
      screen.getByText(
        'Se repetirá cada lunes, martes, miércoles y viernes, de 12:00 a. m. a 12:30 a. m.',
      ),
    ).toBeInTheDocument()
  })

  it('los resúmenes de las demás opciones usan la fecha y las horas', async () => {
    await open('/tareas/nueva')
    await userEvent.selectOptions(select('Tarea a repetir'), 'weekly')
    expect(
      screen.getByText('Se repetirá cada sábado, de 2:00 p. m. a 2:30 p. m.'),
    ).toBeInTheDocument()
    await userEvent.selectOptions(select('Tarea a repetir'), 'weekdays')
    expect(
      screen.getByText('Se repetirá de lunes a viernes, de 2:00 p. m. a 2:30 p. m.'),
    ).toBeInTheDocument()
    await userEvent.selectOptions(select('Tarea a repetir'), 'daily')
    expect(
      screen.getByText('Se repetirá todos los días, de 2:00 p. m. a 2:30 p. m.'),
    ).toBeInTheDocument()
  })

  it('sin ningún día elegido no se guarda y avisa (CA-21)', async () => {
    await open('/tareas/nueva')
    await userEvent.type(screen.getByLabelText('Título'), 'Sin días')
    await userEvent.selectOptions(select('Tarea a repetir'), 'custom')
    await userEvent.click(chip('sábado')) // apaga el único día
    await userEvent.click(screen.getByRole('button', { name: 'Guardar tarea' }))
    expect(screen.getByText('Elige al menos un día.')).toHaveAttribute('role', 'alert')
    expect(posts()).toHaveLength(0)
  })

  it('envía la regla y crea la serie (CA-22)', async () => {
    await open('/tareas/nueva')
    await userEvent.type(screen.getByLabelText('Título'), 'Estudiar inglés')
    await userEvent.selectOptions(select('Tarea a repetir'), 'custom')
    for (const day of ['viernes', 'lunes']) await userEvent.click(chip(day))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar tarea' }))
    await waitFor(() => expect(posts()).toHaveLength(1))
    expect(posts()[0]?.body).toMatchObject({
      repeat: { kind: 'custom', days: [1, 5, 6] }, // ordenados, con el sábado de la fecha
    })
    await waitFor(() => expect(location()).toMatch(/^\/calendario/))
    expect(api.series).toHaveLength(1)
    expect(api.tasks.length).toBeGreaterThan(100)
  })

  it('«No se repite» no envía regla', async () => {
    await open('/tareas/nueva')
    await userEvent.type(screen.getByLabelText('Título'), 'Una vez')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar tarea' }))
    await waitFor(() => expect(posts()).toHaveLength(1))
    expect(posts()[0]?.body).not.toHaveProperty('repeat')
  })

  it('cada opción simple envía solo su tipo', async () => {
    await open('/tareas/nueva')
    await userEvent.type(screen.getByLabelText('Título'), 'L–V')
    await userEvent.selectOptions(select('Tarea a repetir'), 'weekdays')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar tarea' }))
    await waitFor(() => expect(posts()).toHaveLength(1))
    expect(posts()[0]?.body).toMatchObject({ repeat: { kind: 'weekdays' } })
    expect((posts()[0]?.body as { repeat: object }).repeat).not.toHaveProperty('days')
  })
})

describe('«Notificar» (RF-034)', () => {
  it('abre marcada con 15 minutos y el resumen del diseño (CA-26)', async () => {
    await open('/tareas/nueva')
    await userEvent.selectOptions(select('Hora de inicio'), '0')
    expect(screen.getByRole('checkbox', { name: /Notificar/ })).toBeChecked()
    expect(
      screen.getByText('La notificación se programa en el dispositivo y funciona sin conexión.'),
    ).toBeInTheDocument()
    expect(select('Cuánto antes avisar (cantidad)')).toHaveValue('15')
    expect(select('Cuánto antes avisar (unidad)')).toHaveValue('minutes')
    expect(optionTexts('Cuánto antes avisar (unidad)')).toEqual([
      'minutos',
      'horas',
      'días',
      'semanas',
    ])
    expect(optionTexts('Cuánto antes avisar (cantidad)')).toHaveLength(60)
    expect(screen.getByText('antes')).toBeInTheDocument()
    expect(
      screen.getByText('Te avisaremos 15 minutos antes de las 12:00 a. m.'),
    ).toBeInTheDocument()
  })

  it('al desmarcarla se ocultan las listas y no se avisa (CA-26)', async () => {
    await open('/tareas/nueva')
    await userEvent.type(screen.getByLabelText('Título'), 'Sin aviso')
    await userEvent.click(screen.getByRole('checkbox', { name: /Notificar/ }))
    expect(screen.queryByLabelText(/cantidad/)).toBeNull()
    expect(screen.queryByLabelText(/unidad/)).toBeNull()
    expect(screen.queryByText(/Te avisaremos/)).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Guardar tarea' }))
    await waitFor(() => expect(posts()).toHaveLength(1))
    expect(posts()[0]?.body).toMatchObject({ reminder: null })
  })

  it('usa singular y plural en el resumen y envía lo elegido (CA-26)', async () => {
    await open('/tareas/nueva')
    await userEvent.type(screen.getByLabelText('Título'), 'Con aviso')
    await userEvent.selectOptions(select('Cuánto antes avisar (cantidad)'), '2')
    await userEvent.selectOptions(select('Cuánto antes avisar (unidad)'), 'hours')
    expect(screen.getByText('Te avisaremos 2 horas antes de las 2:00 p. m.')).toBeInTheDocument()
    await userEvent.selectOptions(select('Cuánto antes avisar (cantidad)'), '1')
    expect(screen.getByText('Te avisaremos 1 hora antes de las 2:00 p. m.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Guardar tarea' }))
    await waitFor(() => expect(posts()).toHaveLength(1))
    expect(posts()[0]?.body).toMatchObject({ reminder: { amount: 1, unit: 'hours' } })
  })

  it('más de 4 semanas se rechaza con un mensaje y no se guarda (CA-27)', async () => {
    await open('/tareas/nueva')
    await userEvent.type(screen.getByLabelText('Título'), 'Muy anticipado')
    await userEvent.selectOptions(select('Cuánto antes avisar (cantidad)'), '5')
    await userEvent.selectOptions(select('Cuánto antes avisar (unidad)'), 'weeks')
    expect(screen.getByText('El aviso no puede ser más de 4 semanas antes.')).toHaveAttribute(
      'role',
      'alert',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Guardar tarea' }))
    expect(posts()).toHaveLength(0)
    await userEvent.selectOptions(select('Cuánto antes avisar (cantidad)'), '4')
    expect(screen.queryByText('El aviso no puede ser más de 4 semanas antes.')).toBeNull()
  })

  it('al editar muestra el aviso guardado y envía el cambio', async () => {
    const task = api.seed(ana, {
      title: 'Con aviso',
      start_at: '2026-11-03T20:00:00Z',
      reminder: { amount: 3, unit: 'days' },
    })
    await open(`/tareas/${task.id}/editar`)
    await screen.findByRole('heading', { name: 'Editar tarea' })
    expect(select('Cuánto antes avisar (cantidad)')).toHaveValue('3')
    expect(select('Cuánto antes avisar (unidad)')).toHaveValue('days')
    await userEvent.click(screen.getByRole('checkbox', { name: /Notificar/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(api.calls.some((c) => c.method === 'PATCH')).toBe(true))
    const patch = api.calls.find((c) => c.method === 'PATCH')
    expect(patch?.body).toMatchObject({ reminder: null })
    expect(api.tasks.find((t) => t.id === task.id)?.reminder_enabled).toBe(false)
  })

  it('una tarea sin aviso se abre con «Notificar» desmarcada', async () => {
    const task = api.seed(ana, {
      title: 'Sin aviso',
      start_at: '2026-11-03T20:00:00Z',
      reminder: null,
      reminder_enabled: false,
    })
    await open(`/tareas/${task.id}/editar`)
    await screen.findByRole('heading', { name: 'Editar tarea' })
    expect(screen.getByRole('checkbox', { name: /Notificar/ })).not.toBeChecked()
  })
})

describe('series en el calendario (RF-032, RF-033)', () => {
  /** Una serie semanal de tres sábados a las 3:00 p. m. */
  function seedSeries() {
    api.series.push({ id: 'serie-1', kind: 'weekly', days: [6] })
    return ['2026-11-07', '2026-11-14', '2026-11-21'].map((day) =>
      api.seed(ana, { title: 'Clase', start_at: `${day}T20:00:00Z`, series_id: 'serie-1' }),
    )
  }

  it('las repeticiones muestran el ícono y se anuncian como «se repite» (CA-24)', async () => {
    seedSeries()
    api.seed(ana, { title: 'Suelta', start_at: '2026-11-03T20:00:00Z' })
    await open('/calendario?vista=mes&fecha=2026-11-10')
    const clase = await screen.findAllByRole('button', { name: /Clase.*se repite/ })
    expect(clase).toHaveLength(3) // sábados 7, 14 y 21 de noviembre
    for (const pill of clase) expect(pill.querySelector('svg')).not.toBeNull()
    const suelta = screen.getByRole('button', { name: /Suelta/ })
    expect(suelta).not.toHaveAccessibleName(/se repite/)
  })

  it('al editar, la regla se ve de solo lectura y avisa que afecta solo a esta (RF-033)', async () => {
    const [first] = seedSeries()
    await open(`/tareas/${first!.id}/editar`)
    await screen.findByRole('heading', { name: 'Editar tarea' })
    expect(select('Tarea a repetir')).toBeDisabled()
    expect(select('Tarea a repetir')).toHaveValue('weekly')
    expect(
      screen.getByText(/Se repetirá cada sábado, de 3:00 p. m. a 3:30 p. m./),
    ).toBeInTheDocument()
    expect(screen.getByText(/parte de una serie/)).toBeInTheDocument()
  })

  it('«Solo esta» borra únicamente esa repetición (CA-25)', async () => {
    const [first, second, third] = seedSeries()
    await open(`/tareas/${second!.id}/editar`)
    await userEvent.click(await screen.findByRole('button', { name: 'Borrar tarea' }))
    const dialog = screen.getByRole('alertdialog')
    expect(within(dialog).getByRole('button', { name: 'Solo esta' })).toBeInTheDocument()
    expect(
      within(dialog).getByRole('button', { name: 'Esta y las siguientes' }),
    ).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Solo esta' }))
    await waitFor(() => expect(location()).toMatch(/^\/calendario/))
    const del = api.calls.find((c) => c.method === 'DELETE')
    expect(del?.query).toBe('?scope=this')
    expect(api.tasks.map((t) => t.id)).toEqual([first!.id, third!.id])
  })

  it('«Esta y las siguientes» conserva las anteriores (CA-25)', async () => {
    const [first, second] = seedSeries()
    await open(`/tareas/${second!.id}/editar`)
    await userEvent.click(await screen.findByRole('button', { name: 'Borrar tarea' }))
    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Esta y las siguientes',
      }),
    )
    await waitFor(() => expect(location()).toMatch(/^\/calendario/))
    expect(api.calls.find((c) => c.method === 'DELETE')?.query).toBe('?scope=following')
    expect(api.tasks.map((t) => t.id)).toEqual([first!.id])
  })

  it('una tarea que no se repite se borra con la confirmación de siempre', async () => {
    const task = api.seed(ana, { title: 'Suelta', start_at: '2026-11-03T20:00:00Z' })
    await open(`/tareas/${task.id}/editar`)
    await userEvent.click(await screen.findByRole('button', { name: 'Borrar tarea' }))
    const dialog = screen.getByRole('alertdialog')
    expect(within(dialog).queryByRole('button', { name: 'Solo esta' })).toBeNull()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Sí, borrar' }))
    await waitFor(() => expect(api.tasks).toHaveLength(0))
  })
})
