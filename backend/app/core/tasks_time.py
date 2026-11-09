"""Lógica pura de fechas de tareas (RF-008, RF-012, RF-021, RF-024). Todo en UTC."""

from datetime import UTC, datetime, timedelta

# Un rango de consulta cubre como mucho una cuadrícula de 6 semanas (42 días) más margen
# por cambios de horario en otras zonas.
MAX_RANGE = timedelta(days=43)
MAX_DURATION_MINUTES = 1440
# Fechas guardables: ±5 años respecto a hoy (Q-8).
SAVEABLE_SPAN = timedelta(days=5 * 366)


def to_utc(value: datetime) -> datetime:
    return value.astimezone(UTC)


def is_saveable(value: datetime, now: datetime | None = None) -> bool:
    now = now or datetime.now(UTC)
    return abs(to_utc(value) - now) <= SAVEABLE_SPAN


def valid_range(range_from: datetime, range_to: datetime) -> bool:
    return range_from < range_to and (range_to - range_from) <= MAX_RANGE


def start_search_window(range_from: datetime) -> datetime:
    """Inicio de la búsqueda por start_at: incluye tareas que empezaron antes del rango.

    Como ninguna tarea dura más de 24 h, basta retroceder 24 h (D-4 del plan).
    """
    return range_from - timedelta(minutes=MAX_DURATION_MINUTES)


def overlaps(
    start_at: datetime, duration_minutes: int, range_from: datetime, range_to: datetime
) -> bool:
    end_at = start_at + timedelta(minutes=duration_minutes)
    return start_at < range_to and end_at > range_from
