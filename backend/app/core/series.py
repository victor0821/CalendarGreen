"""Creación y renovación de series de repetición (RF-029…RF-031).

Cada repetición es una tarea real; la serie guarda la plantilla y hasta dónde hay copias.
La renovación es perezosa (D-12): al pedir un periodo que la serie aún no cubre, se crean las
repeticiones que faltan. Es idempotente: la base ignora duplicados (D-13).
"""

import logging
from datetime import UTC, datetime
from zoneinfo import ZoneInfo

from app.core.errors import AppError
from app.core.recurrence import (
    MAX_PER_BATCH,
    MAX_PER_EXTENSION,
    TooManyOccurrences,
    days_for,
    expand,
    horizon_end,
)
from app.core.tasks_time import SAVEABLE_SPAN, to_utc
from app.db.base import DatabaseUnavailable, Repository
from app.db.models import Task, User
from app.schemas.tasks import TaskCreate

logger = logging.getLogger(__name__)

MAX_TASKS_PER_USER = 5000  # tope por usuario para cuidar el límite gratuito de la base (Q-26)


def _too_many() -> AppError:
    return AppError(
        "too_many_tasks",
        "Alcanzaste el máximo de tareas guardadas. Borra algunas e inténtalo de nuevo.",
        422,
    )


def create_series_with_tasks(repository: Repository, user: User, body: TaskCreate) -> Task:
    """Crea la serie y las repeticiones de los próximos 12 meses; devuelve la primera."""
    assert body.repeat is not None
    local = to_utc(body.start_at).astimezone(ZoneInfo(user.timezone))
    starts_on = local.date()
    start_minute = local.hour * 60 + local.minute
    days = days_for(body.repeat.kind, body.repeat.days, starts_on)
    until = horizon_end(starts_on, user.timezone)

    try:
        starts = expand(days, starts_on, start_minute, user.timezone, until, limit=MAX_PER_BATCH)
    except TooManyOccurrences:
        raise _too_many() from None
    if not starts:
        raise AppError("validation_error", "La repetición no genera ninguna tarea.", 422)
    if repository.count_user_tasks(user.id) + len(starts) > MAX_TASKS_PER_USER:
        raise _too_many()

    reminder = body.reminder
    series = repository.create_series(
        user.id,
        repeat_kind=body.repeat.kind,
        repeat_days=days,
        starts_on=starts_on,
        start_minute=start_minute,
        duration_minutes=body.duration_minutes,
        timezone=user.timezone,
        generated_until=until,
        title=body.title,
        notes=body.notes,
        source=body.source,
        reminder_amount=reminder.amount if reminder else None,
        reminder_unit=reminder.unit if reminder else None,
    )
    created = repository.insert_series_tasks(series, starts)
    return created[0]


def ensure_generated(
    repository: Repository, user_id: str, range_to: datetime, now: datetime | None = None
) -> None:
    """Completa las series del usuario que no llegan hasta `range_to` (renovación perezosa)."""
    now = now or datetime.now(UTC)
    cap = now + SAVEABLE_SPAN  # no se crean repeticiones más allá de las fechas guardables
    try:
        pending = repository.list_series_to_extend(user_id, range_to)
        total = repository.count_user_tasks(user_id) if pending else 0
        for series in pending:
            base = (
                max(range_to, series.generated_until).astimezone(ZoneInfo(series.timezone)).date()
            )
            target = min(horizon_end(base, series.timezone), cap)
            if series.ends_before is not None:
                target = min(target, series.ends_before)
            if target <= series.generated_until:
                continue
            if total >= MAX_TASKS_PER_USER:
                logger.warning("series_extension_skipped_user_limit")
                continue
            try:
                starts = expand(
                    series.repeat_days,
                    series.starts_on,
                    series.start_minute,
                    series.timezone,
                    target,
                    after=series.generated_until,
                    ends_before=series.ends_before,
                    limit=MAX_PER_EXTENSION,
                )
            except TooManyOccurrences:
                logger.warning("series_extension_skipped_too_many")
                continue
            total += len(repository.insert_series_tasks(series, starts))
            repository.set_series_generated_until(user_id, series.id, target)
    except DatabaseUnavailable:
        # La renovación es de mejor esfuerzo: si falla se devuelve lo que ya existe y se reintenta
        # en la siguiente lectura. Si la base de verdad no responde, la consulta principal dará 503.
        logger.warning("series_extension_failed")
