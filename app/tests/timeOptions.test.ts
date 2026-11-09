/** RF-028, RF-029, RF-034 / CA-19, CA-20, CA-21, CA-26, CA-27: horas, repetición y aviso. */
import { describe, expect, it } from 'vitest'
import { validate } from '../src/pages/TaskForm'
import {
  defaultEnd,
  describeReminder,
  describeRepeat,
  endOptions,
  listInSpanish,
  optionLabel,
  reminderPhrase,
  reminderTooLong,
  shiftEnd,
  startOptions,
} from '../src/tasks/timeOptions'

const h = (hours: number, minutes = 0) => hours * 60 + minutes

describe('listas de horas (RF-028)', () => {
  it('la hora de inicio ofrece 48 horas cada 30 minutos, de 12:00 a. m. a 11:30 p. m. (CA-19)', () => {
    const options = startOptions()
    expect(options).toHaveLength(48)
    expect(optionLabel(options[0]!)).toBe('12:00 a. m.')
    expect(optionLabel(options[1]!)).toBe('12:30 a. m.')
    expect(optionLabel(options[47]!)).toBe('11:30 p. m.')
  })

  it('la hora final ofrece solo horas posteriores, hasta las 12:00 a. m. (CA-19)', () => {
    const options = endOptions(h(15))
    expect(optionLabel(options[0]!)).toBe('3:30 p. m.')
    expect(optionLabel(options[options.length - 1]!)).toBe('12:00 a. m.')
    expect(options.every((m) => m > h(15))).toBe(true)
    expect(options).toHaveLength(18)
  })

  it('a las 11:30 p. m. la única hora final posible es 12:00 a. m. (CA-20)', () => {
    expect(endOptions(h(23, 30))).toEqual([1440])
  })

  it('una hora fuera de la cuadrícula se agrega para no perderla (tareas de voz)', () => {
    expect(startOptions(h(15, 10))).toContain(h(15, 10))
    expect(startOptions(h(15, 10))).toHaveLength(49)
    expect(optionLabel(h(15, 10))).toBe('3:10 p. m.')
    expect(endOptions(h(15), h(15, 35))).toContain(h(15, 35))
  })

  it('una hora final después de la medianoche se marca como del día siguiente', () => {
    const options = endOptions(h(23), h(25))
    expect(options).toContain(h(25))
    expect(optionLabel(h(25))).toBe('1:00 a. m. (día siguiente)')
  })

  it('la hora final inicial es 30 minutos después, sin pasar de la medianoche', () => {
    expect(defaultEnd(h(15))).toBe(h(15, 30))
    expect(defaultEnd(h(23, 30))).toBe(1440)
  })

  it('al cambiar el inicio, la final conserva la duración si cabe (CA-20)', () => {
    expect(shiftEnd(h(17), 90)).toBe(h(18, 30)) // 3:00–4:30 → 5:00–6:30
    expect(shiftEnd(h(23), 90)).toBe(1440) // no cabe: queda en la última posible
    expect(shiftEnd(h(23, 30), 30)).toBe(1440)
  })
})

describe('resumen de la repetición (RF-029, U-19)', () => {
  it('reproduce el ejemplo del diseño con un solo punto final (CA-21)', () => {
    expect(describeRepeat('custom', [1, 2, 3, 5], 7, 0, h(0, 30))).toBe(
      'Se repetirá cada lunes, martes, miércoles y viernes, de 12:00 a. m. a 12:30 a. m.',
    )
  })

  it('cada semana usa el día de la fecha', () => {
    expect(describeRepeat('weekly', [], 7, h(9), h(10))).toBe(
      'Se repetirá cada domingo, de 9:00 a. m. a 10:00 a. m.',
    )
  })

  it('de lunes a viernes y todos los días', () => {
    expect(describeRepeat('weekdays', [], 3, h(18), h(19))).toBe(
      'Se repetirá de lunes a viernes, de 6:00 p. m. a 7:00 p. m.',
    )
    expect(describeRepeat('daily', [], 3, h(8), h(8, 30))).toBe(
      'Se repetirá todos los días, de 8:00 a. m. a 8:30 a. m.',
    )
  })

  it('personalizado ordena los días y admite uno solo', () => {
    expect(describeRepeat('custom', [5, 1], 1, h(9), h(10))).toContain('cada lunes y viernes')
    expect(describeRepeat('custom', [3], 1, h(9), h(10))).toContain('cada miércoles,')
  })

  it('sin repetición o sin días no hay resumen', () => {
    expect(describeRepeat('none', [], 1, h(9), h(10))).toBe('')
    expect(describeRepeat('custom', [], 1, h(9), h(10))).toBe('')
  })

  it('nunca termina con dos puntos', () => {
    for (const choice of ['weekly', 'weekdays', 'daily', 'custom'] as const) {
      const text = describeRepeat(choice, [1], 1, h(9), h(10))
      expect(text.endsWith('..')).toBe(false)
      expect(text.endsWith('.')).toBe(true)
    }
  })

  it('lista en español', () => {
    expect(listInSpanish([])).toBe('')
    expect(listInSpanish(['lunes'])).toBe('lunes')
    expect(listInSpanish(['lunes', 'martes'])).toBe('lunes y martes')
    expect(listInSpanish(['a', 'b', 'c'])).toBe('a, b y c')
  })
})

describe('aviso «Notificar» (RF-034)', () => {
  it('reproduce el ejemplo del diseño (CA-26)', () => {
    expect(describeReminder(15, 'minutes', 0)).toBe(
      'Te avisaremos 15 minutos antes de las 12:00 a. m.',
    )
  })

  it('usa singular cuando es 1 (CA-26)', () => {
    expect(describeReminder(1, 'hours', h(15))).toBe('Te avisaremos 1 hora antes de las 3:00 p. m.')
    expect(describeReminder(2, 'hours', h(15))).toBe(
      'Te avisaremos 2 horas antes de las 3:00 p. m.',
    )
    expect(reminderPhrase(1, 'minutes')).toBe('1 minuto')
    expect(reminderPhrase(1, 'days')).toBe('1 día')
    expect(reminderPhrase(3, 'days')).toBe('3 días')
    expect(reminderPhrase(1, 'weeks')).toBe('1 semana')
    expect(reminderPhrase(4, 'weeks')).toBe('4 semanas')
  })

  it('no puede ser de más de 4 semanas (CA-27)', () => {
    expect(reminderTooLong(4, 'weeks')).toBe(false)
    expect(reminderTooLong(5, 'weeks')).toBe(true)
    expect(reminderTooLong(28, 'days')).toBe(false)
    expect(reminderTooLong(29, 'days')).toBe(true)
    expect(reminderTooLong(60, 'hours')).toBe(false)
    expect(reminderTooLong(60, 'minutes')).toBe(false)
  })
})

describe('validación del formulario (RF-021)', () => {
  const ok = {
    title: 'Algo',
    date: '2026-11-05',
    start: h(15),
    end: h(15, 30),
    repeat: 'none' as const,
    repeatDays: [],
    notes: '',
    notify: true,
    amount: 15,
    unit: 'minutes' as const,
    completed: false,
  }

  it('un formulario correcto no tiene errores', () => {
    expect(validate(ok)).toEqual({})
  })

  it('la hora final debe ser posterior a la de inicio', () => {
    expect(validate({ ...ok, end: h(15) }).end).toBe(
      'La hora final debe ser después de la de inicio.',
    )
    expect(validate({ ...ok, end: h(14) }).end).toBeDefined()
  })

  it('«Personalizado» exige al menos un día', () => {
    expect(validate({ ...ok, repeat: 'custom', repeatDays: [] }).repeat).toBe(
      'Elige al menos un día.',
    )
    expect(validate({ ...ok, repeat: 'custom', repeatDays: [1] }).repeat).toBeUndefined()
  })

  it('el aviso no puede superar las 4 semanas, y solo se valida si está activado', () => {
    const long = { ...ok, amount: 5, unit: 'weeks' as const }
    expect(validate(long).notify).toBe('El aviso no puede ser más de 4 semanas antes.')
    expect(validate({ ...long, notify: false }).notify).toBeUndefined()
  })

  it('título y fecha siguen validándose', () => {
    expect(validate({ ...ok, title: '   ' }).title).toBeDefined()
    expect(validate({ ...ok, date: '' }).date).toBeDefined()
  })
})
