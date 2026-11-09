/**
 * Flujo crítico de punta a punta (constitución §5): registro → crear tarea → ver en el
 * calendario → mover, completar, editar, borrar → cerrar sesión → iniciar sesión.
 * Corre contra el backend real y la base Supabase dev.
 */
import { expect, test, type Page } from '@playwright/test'

const SHOTS = 'e2e/screenshots'
const PASSWORD = 'contraseña-e2e-segura'
const run = Date.now().toString(36)
const emailA = `e2e-a-${run}@example.com`
const emailB = `e2e-b-${run}@example.com`

/** Fecha de hoy en Bogotá (YYYY-MM-DD) sumando días. */
function bogotaDate(plusDays = 0): string {
  const base = new Date(Date.now() + plusDays * 86_400_000)
  return base.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
}

async function register(page: Page, email: string) {
  await page.goto('/registro')
  await page.getByLabel('Correo').fill(email)
  await page.getByLabel('Contraseña').fill(PASSWORD)
  await page.getByRole('button', { name: 'Crear cuenta y entrar' }).click()
  await expect(page).toHaveURL(/\/calendario/)
}

async function createTask(page: Page, title: string, date: string, start: string, end?: string) {
  await page.getByRole('link', { name: 'Nueva tarea' }).click()
  await expect(page.getByRole('heading', { name: 'Nueva tarea' })).toBeVisible()
  await page.getByLabel('Título', { exact: true }).fill(title)
  await page.getByLabel('Fecha', { exact: true }).fill(date)
  await page.getByLabel('Hora de inicio', { exact: true }).selectOption({ label: start })
  if (end) await page.getByLabel('Hora final', { exact: true }).selectOption({ label: end })
  await page.getByRole('button', { name: 'Guardar tarea' }).click()
  await expect(page).toHaveURL(/\/calendario/)
}

test('el backend está vivo y conectado a la base', async ({ request }) => {
  const response = await request.get('http://localhost:8000/api/v1/health')
  expect(response.status()).toBe(200)
  expect(await response.json()).toEqual({ status: 'ok', environment: 'dev', database: 'ok' })
})

test('un visitante no ve el calendario y es llevado a /login', async ({ page }) => {
  await page.goto('/calendario')
  await expect(page).toHaveURL(/\/login$/)
  await page.screenshot({ path: `${SHOTS}/01-login.png` })
  await expect(page.getByRole('heading', { name: 'Inicia sesión' })).toBeVisible()
})

test('flujo completo de una persona usuaria', async ({ page }) => {
  await test.step('registro con validación y entrada directa al calendario', async () => {
    await page.goto('/registro')
    await page.screenshot({ path: `${SHOTS}/02-registro.png` })
    await page.getByLabel('Correo').fill(emailA)
    await page.getByLabel('Contraseña').fill('corta')
    await page.getByRole('button', { name: 'Crear cuenta y entrar' }).click()
    await expect(page.getByText('Usa al menos 8 caracteres.').last()).toBeVisible()
    await register(page, emailA)
    await expect(page.getByText(emailA)).toBeVisible()
  })

  await test.step('el correo repetido se rechaza con un mensaje claro', async () => {
    const other = await page.context().browser()!.newContext()
    const second = await other.newPage()
    await second.goto('http://localhost:5173/registro')
    await second.getByLabel('Correo').fill(emailA)
    await second.getByLabel('Contraseña').fill(PASSWORD)
    await second.getByRole('button', { name: 'Crear cuenta y entrar' }).click()
    await expect(second.getByText(/Ese correo ya tiene una cuenta/)).toBeVisible()
    await other.close()
  })

  const today = bogotaDate()
  const tomorrow = bogotaDate(1)

  await test.step('crear tareas con el formulario manual', async () => {
    await page.getByRole('link', { name: 'Nueva tarea' }).click()
    await page.screenshot({ path: `${SHOTS}/03-nueva-tarea.png` })
    await page.getByRole('link', { name: 'Cancelar' }).click()

    await createTask(page, 'Revisar informe', today, '10:00 a. m.', '11:00 a. m.')
    await createTask(page, 'Llamar a mamá', today, '6:00 p. m.')
    await createTask(page, 'Cita médica', tomorrow, '2:30 p. m.', '3:00 p. m.')
    await expect(page.getByRole('button', { name: /Revisar informe/ }).first()).toBeVisible()
  })

  await test.step('ver las tareas en mes, semana y día', async () => {
    // Al guardar, el calendario muestra la fecha de la última tarea (mañana): se vuelve a hoy.
    await page.getByRole('button', { name: 'Hoy', exact: true }).click()
    await page.getByRole('button', { name: 'Mes', exact: true }).click()
    await expect(page.getByRole('button', { name: /Llamar a mamá/ }).first()).toBeVisible()
    await page.screenshot({ path: `${SHOTS}/04-mes.png` })

    await page.getByRole('button', { name: 'Semana', exact: true }).click()
    await expect(page.getByRole('button', { name: /Llamar a mamá/ }).first()).toBeVisible()
    await expect(page.getByTestId('now-line')).toBeVisible()
    await page.screenshot({ path: `${SHOTS}/05-semana.png` })

    await page.getByRole('button', { name: 'Día', exact: true }).click()
    await expect(page.getByRole('complementary', { name: 'Tareas del día' })).toContainText(
      '2 tareas · 0 hechas',
    )
    await expect(page.getByText(/Tu tiempo libre: antes de las 10:00 a\. m\./)).toBeVisible()
    await page.screenshot({ path: `${SHOTS}/06-dia.png` })
  })

  await test.step('completar desde el panel del día y desde la barra lateral', async () => {
    const panel = page.getByRole('complementary', { name: 'Tareas del día' })
    await panel.getByRole('checkbox', { name: /Revisar informe/ }).check()
    await expect(panel).toContainText('2 tareas · 1 hecha')
    await page.getByRole('checkbox', { name: /6:00 p\. m\. Llamar a mamá/ }).check()
    await expect(panel).toContainText('2 tareas · 2 hechas')
    await page.reload() // la persistencia viene del servidor, no solo de la pantalla
    await expect(page.getByRole('complementary', { name: 'Tareas del día' })).toContainText(
      '2 tareas · 2 hechas',
    )
    await page
      .getByRole('checkbox', { name: /Llamar a mamá/ })
      .first()
      .uncheck()
    await expect(panel).toContainText('2 tareas · 1 hecha')
  })

  await test.step('mover una tarea arrastrándola en la vista mes', async () => {
    await page.getByRole('button', { name: 'Mes', exact: true }).click()
    const pill = page.getByRole('button', { name: /Cita médica/ }).first()
    await expect(pill).toBeVisible()
    const target = page.locator(`[role="gridcell"][data-date="${bogotaDate(3)}"]`)
    if (await target.count()) {
      await pill.dragTo(target)
      await expect(target.getByRole('button', { name: /Cita médica/ })).toBeVisible()
    }
  })

  await test.step('editar una tarea', async () => {
    await page
      .getByRole('button', { name: /Llamar a mamá/ })
      .first()
      .click()
    await expect(page.getByRole('heading', { name: 'Editar tarea' })).toBeVisible()
    await page.getByLabel('Título', { exact: true }).fill('Llamar a mamá (editada)')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(
      page.getByRole('button', { name: /Llamar a mamá \(editada\)/ }).first(),
    ).toBeVisible()
  })

  await test.step('borrar una tarea con confirmación', async () => {
    await page
      .getByRole('button', { name: /Cita médica/ })
      .first()
      .click()
    await page.getByRole('button', { name: 'Borrar tarea' }).click()
    await page.screenshot({ path: `${SHOTS}/07-confirmar-borrado.png` })
    await page.getByRole('button', { name: 'Sí, borrar' }).click()
    await expect(page).toHaveURL(/\/calendario/)
    await expect(page.getByRole('button', { name: /Cita médica/ })).toHaveCount(0)
  })

  await test.step('modo oscuro', async () => {
    await page.getByRole('button', { name: 'Modo oscuro' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await page.screenshot({ path: `${SHOTS}/08-oscuro.png` })
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await page.getByRole('button', { name: 'Modo claro' }).click()
  })

  await test.step('cerrar sesión y volver a entrar', async () => {
    await page.getByRole('button', { name: /Cerrar sesión/ }).click()
    await expect(page).toHaveURL(/\/login$/)
    await page.goto('/calendario')
    await expect(page).toHaveURL(/\/login$/) // sin sesión no se entra

    await page.getByLabel('Correo').fill(emailA)
    await page.getByLabel('Contraseña').fill('contraseña-equivocada')
    await page.getByRole('button', { name: 'Entrar a mi calendario' }).click()
    await expect(page.getByText('Correo o contraseña incorrectos.')).toBeVisible()

    await page.getByLabel('Contraseña').fill(PASSWORD)
    await page.getByRole('button', { name: 'Entrar a mi calendario' }).click()
    await expect(page).toHaveURL(/\/calendario/)
    await expect(
      page.getByRole('button', { name: /Llamar a mamá \(editada\)/ }).first(),
    ).toBeVisible()
  })

  await test.step('la sesión se mantiene al recargar', async () => {
    await page.reload()
    await expect(page).toHaveURL(/\/calendario/)
    await expect(page.getByText(emailA)).toBeVisible()
  })
})

test('otra persona usuaria no ve nada de la primera (aislamiento)', async ({ page }) => {
  await register(page, emailB)
  await expect(page.getByRole('button', { name: /Llamar a mamá/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Revisar informe/ })).toHaveCount(0)
  await expect(page.getByText('No tienes tareas en este periodo.')).toBeVisible()

  // Aunque conozca la API, el token de B no abre las tareas de A.
  const token = await page.evaluate(() => localStorage.getItem('calendargreen-token'))
  const response = await page.request.get(
    `http://localhost:8000/api/v1/tasks?from=${bogotaDate(-30)}T00:00:00-05:00&to=${bogotaDate(10)}T00:00:00-05:00`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  expect(response.status()).toBe(200)
  expect((await response.json()).items).toEqual([])
})

test('una tarea que se repite: crear, renovar, completar una y borrar «esta y las siguientes»', async ({
  page,
}) => {
  const emailC = `e2e-c-${run}@example.com`
  await register(page, emailC)

  await test.step('crear la serie de lunes a viernes con aviso de 2 horas', async () => {
    await page.getByRole('link', { name: 'Nueva tarea' }).click()
    await page.getByLabel('Título', { exact: true }).fill('Gimnasio')
    await page.getByLabel('Fecha', { exact: true }).fill(bogotaDate())
    await page.getByLabel('Hora de inicio', { exact: true }).selectOption({ label: '6:00 a. m.' })
    await page.getByLabel('Hora final', { exact: true }).selectOption({ label: '7:00 a. m.' })
    await page
      .getByLabel('Tarea a repetir', { exact: true })
      .selectOption({ label: 'De lunes a viernes' })
    await expect(
      page.getByText('Se repetirá de lunes a viernes, de 6:00 a. m. a 7:00 a. m.'),
    ).toBeVisible()
    await page.getByLabel('Cuánto antes avisar (cantidad)').selectOption('2')
    await page.getByLabel('Cuánto antes avisar (unidad)').selectOption({ label: 'horas' })
    await expect(page.getByText('Te avisaremos 2 horas antes de las 6:00 a. m.')).toBeVisible()
    await page.screenshot({ path: `${SHOTS}/09-formulario-repeticion.png` })
    await page.getByRole('button', { name: 'Guardar tarea' }).click()
    await expect(page).toHaveURL(/\/calendario/)
  })

  await test.step('las repeticiones aparecen con su ícono en el mes', async () => {
    await page.getByRole('button', { name: 'Mes', exact: true }).click()
    const repeated = page.getByRole('button', { name: /Gimnasio.*se repite/ })
    await expect(repeated.first()).toBeVisible()
    expect(await repeated.count()).toBeGreaterThanOrEqual(1)
    await page.screenshot({ path: `${SHOTS}/10-mes-con-repeticiones.png` })
  })

  await test.step('un mes lejano se renueva solo (más allá de los 12 meses iniciales)', async () => {
    const [y, m] = bogotaDate().split('-').map(Number)
    const far = new Date(Date.UTC(y!, m! - 1 + 14, 15)).toISOString().slice(0, 10)
    await page.goto(`/calendario?vista=mes&fecha=${far}`)
    await expect(page.getByRole('button', { name: /Gimnasio.*se repite/ }).first()).toBeVisible()
  })

  await test.step('editar una repetición muestra la regla de solo lectura', async () => {
    await page.goto(`/calendario?vista=mes&fecha=${bogotaDate()}`)
    await page
      .getByRole('button', { name: /Gimnasio.*se repite/ })
      .first()
      .click()
    await expect(page.getByRole('heading', { name: 'Editar tarea' })).toBeVisible()
    await expect(page.getByLabel('Tarea a repetir', { exact: true })).toBeDisabled()
    await expect(page.getByLabel('Tarea a repetir', { exact: true })).toHaveValue('weekdays')
    await expect(page.getByLabel('Cuánto antes avisar (cantidad)')).toHaveValue('2')
    await page.screenshot({ path: `${SHOTS}/11-editar-repeticion.png` })
  })

  await test.step('borrar «esta y las siguientes» elimina la serie', async () => {
    await page.getByRole('button', { name: 'Borrar tarea' }).click()
    await page.screenshot({ path: `${SHOTS}/12-borrar-serie.png` })
    await page.getByRole('button', { name: 'Esta y las siguientes' }).click()
    await expect(page).toHaveURL(/\/calendario/)
    await expect(page.getByRole('button', { name: /Gimnasio/ })).toHaveCount(0)
    const [y, m] = bogotaDate().split('-').map(Number)
    const far = new Date(Date.UTC(y!, m! - 1 + 14, 15)).toISOString().slice(0, 10)
    await page.goto(`/calendario?vista=mes&fecha=${far}`)
    await expect(page.getByText('No tienes tareas en este periodo.')).toBeVisible()
  })
})
