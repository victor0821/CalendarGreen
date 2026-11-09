"""Modelos de dominio devueltos por los repositorios (independientes del proveedor)."""

from dataclasses import dataclass
from datetime import date, datetime


@dataclass(frozen=True)
class User:
    id: str
    email: str
    password_hash: str
    timezone: str
    created_at: datetime
    updated_at: datetime


@dataclass(frozen=True)
class Task:
    id: str
    user_id: str
    title: str
    start_at: datetime  # siempre UTC
    duration_minutes: int
    notes: str | None
    completed_at: datetime | None
    source: str  # manual | voice | text
    reminder_enabled: bool  # «Notificar»
    created_at: datetime
    updated_at: datetime
    series_id: str | None = None  # serie de repetición a la que pertenece
    reminder_amount: int | None = None  # cuánto antes avisar…
    reminder_unit: str | None = None  # …en minutes | hours | days | weeks


@dataclass(frozen=True)
class Series:
    """Plantilla de una tarea que se repite; las repeticiones reales viven en `tasks`."""

    id: str
    user_id: str
    repeat_kind: str  # weekly | weekdays | daily | custom
    repeat_days: list[int]  # días ISO: 1 = lunes … 7 = domingo
    starts_on: date  # fecha local de inicio
    start_minute: int  # hora local de inicio, en minutos desde las 00:00
    duration_minutes: int
    timezone: str
    generated_until: datetime  # hasta dónde hay repeticiones creadas
    ends_before: datetime | None  # no se crean repeticiones desde este instante
    title: str
    notes: str | None
    source: str
    reminder_amount: int | None
    reminder_unit: str | None
    created_at: datetime
    updated_at: datetime
