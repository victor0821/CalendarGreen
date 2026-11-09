"""Expansión de repeticiones (RF-029, RF-030, RF-031). Función pura, sin acceso a datos.

Una serie guarda «días de la semana + hora local + zona horaria». Cada repetición se calcula como
«día local + minuto local» convertido a UTC con la zona IANA, de modo que la hora local se
conserva aunque cambie el horario (D-14 del plan).
"""

import calendar
from collections.abc import Iterable
from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo

HORIZON_MONTHS = 12
# Tope de repeticiones por lote al crear una serie (Q-26). «Todos los días» son ~366 en 12 meses.
MAX_PER_BATCH = 400
# Tope al renovar: puede haber que cubrir un hueco largo si el usuario salta años de golpe.
MAX_PER_EXTENSION = 2500

KINDS = ("weekly", "weekdays", "daily", "custom")


class TooManyOccurrences(Exception):
    """La expansión supera el tope permitido."""


def add_months(day: date, months: int) -> date:
    """Suma meses conservando el día si existe, o el último día del mes si no (31 ene → 28 feb)."""
    total = day.year * 12 + (day.month - 1) + months
    year, month = divmod(total, 12)
    month += 1
    return date(year, month, min(day.day, calendar.monthrange(year, month)[1]))


def days_for(kind: str, custom_days: Iterable[int] | None, start_date: date) -> list[int]:
    """Días ISO (1 = lunes … 7 = domingo) en los que se repite la serie."""
    if kind == "weekly":
        return [start_date.isoweekday()]
    if kind == "weekdays":
        return [1, 2, 3, 4, 5]
    if kind == "daily":
        return [1, 2, 3, 4, 5, 6, 7]
    if kind == "custom":
        return sorted(set(custom_days or []))
    raise ValueError(f"tipo de repetición desconocido: {kind}")


def local_to_utc(day: date, minute: int, timezone: str | ZoneInfo) -> datetime:
    """Instante UTC de «día local + minutos desde las 00:00 locales» en la zona dada."""
    zone = timezone if isinstance(timezone, ZoneInfo) else ZoneInfo(timezone)
    naive = datetime(day.year, day.month, day.day, minute // 60, minute % 60)
    return naive.replace(tzinfo=zone).astimezone(UTC)


def horizon_end(from_day: date, timezone: str) -> datetime:
    """Fin del horizonte de 12 meses: las 23:59 locales del día `from_day + 12 meses`."""
    return local_to_utc(add_months(from_day, HORIZON_MONTHS), 1439, timezone)


def expand(
    days: Iterable[int],
    starts_on: date,
    start_minute: int,
    timezone: str,
    until: datetime,
    *,
    after: datetime | None = None,
    ends_before: datetime | None = None,
    limit: int = MAX_PER_BATCH,
) -> list[datetime]:
    """Repeticiones (UTC) desde `starts_on` hasta `until` inclusive.

    - `after`: solo las posteriores a este instante (renovación: continúa donde quedó la serie).
    - `ends_before`: ninguna a partir de este instante («esta y las siguientes» borradas).
    - Lanza TooManyOccurrences si hay más de `limit`.
    """
    zone = ZoneInfo(timezone)
    wanted = set(days)
    first = starts_on if after is None else max(starts_on, after.astimezone(zone).date())
    last = until.astimezone(zone).date()

    result: list[datetime] = []
    day = first
    while day <= last:
        if day.isoweekday() in wanted:
            start = local_to_utc(day, start_minute, zone)
            if (
                (after is None or start > after)
                and start <= until
                and (ends_before is None or start < ends_before)
            ):
                result.append(start)
                if len(result) > limit:
                    raise TooManyOccurrences(limit)
        day += timedelta(days=1)
    return result
