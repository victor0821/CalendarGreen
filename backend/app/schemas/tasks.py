"""Esquemas de tareas (RF-013, RF-019, RF-021, RF-028…RF-034)."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal

from pydantic import (
    AwareDatetime,
    BaseModel,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

from app.core.tasks_time import is_saveable, to_utc
from app.db.models import Series, Task

Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
Source = Literal["manual", "voice", "text"]
ReminderUnit = Literal["minutes", "hours", "days", "weeks"]
RepeatKind = Literal["weekly", "weekdays", "daily", "custom"]

MAX_REMINDER_DAYS = 28  # el aviso no puede ser de más de 4 semanas antes (RF-034)
_UNIT_MINUTES = {"minutes": 1, "hours": 60, "days": 1440, "weeks": 10080}


def _clean_notes(value: str | None) -> str | None:
    if value is None or not value.strip():
        return None
    return value


def _check_saveable(value: AwareDatetime | None) -> AwareDatetime | None:
    if value is not None and not is_saveable(value):
        raise ValueError("fecha fuera del rango permitido")
    return value


class ReminderIn(BaseModel):
    """Cuánto antes avisar: número (1–60) y unidad, hasta 4 semanas (RF-034)."""

    amount: int = Field(ge=1, le=60)
    unit: ReminderUnit

    @model_validator(mode="after")
    def _within_four_weeks(self) -> ReminderIn:
        if self.amount * _UNIT_MINUTES[self.unit] > MAX_REMINDER_DAYS * 1440:
            raise ValueError("el aviso no puede ser de más de 4 semanas antes")
        return self


class ReminderOut(BaseModel):
    amount: int
    unit: str


class RepeatIn(BaseModel):
    """Regla de repetición (RF-029). `days` (ISO 1 = lunes … 7 = domingo) solo aplica a `custom`."""

    kind: RepeatKind
    days: list[int] | None = None

    @model_validator(mode="after")
    def _validate_days(self) -> RepeatIn:
        if self.kind != "custom":
            self.days = None
            return self
        days = self.days or []
        if not days or len(set(days)) != len(days) or any(d < 1 or d > 7 for d in days):
            raise ValueError(
                "«Personalizado» exige de 1 a 7 días distintos (1 = lunes … 7 = domingo)"
            )
        self.days = sorted(days)
        return self


class RepeatOut(BaseModel):
    kind: str
    days: list[int]


def _default_reminder() -> ReminderIn:
    return ReminderIn(amount=15, unit="minutes")


class TaskCreate(BaseModel):
    title: Title
    start_at: AwareDatetime
    duration_minutes: int = Field(default=30, ge=5, le=1440)
    notes: str | None = Field(default=None, max_length=1000)
    # Si se omite: 15 minutos antes (como el diseño). `null` explícito: sin aviso.
    reminder: ReminderIn | None = Field(default_factory=_default_reminder)
    repeat: RepeatIn | None = None
    source: Source = "manual"

    _notes = field_validator("notes")(_clean_notes)
    _start = field_validator("start_at")(_check_saveable)


class TaskUpdate(BaseModel):
    """Todos los campos son opcionales. `source` y `repeat` no se pueden cambiar."""

    title: Title | None = None
    start_at: AwareDatetime | None = None
    duration_minutes: int | None = Field(default=None, ge=5, le=1440)
    notes: str | None = Field(default=None, max_length=1000)  # null explícito = borrar notas
    reminder: ReminderIn | None = None  # null explícito = no avisar
    completed: bool | None = None

    _notes = field_validator("notes")(_clean_notes)
    _start = field_validator("start_at")(_check_saveable)

    @model_validator(mode="after")
    def _no_null_required_fields(self) -> TaskUpdate:
        for name in ("title", "start_at", "duration_minutes", "completed"):
            if name in self.model_fields_set and getattr(self, name) is None:
                raise ValueError(f"{name} no puede ser nulo")
        return self


class TaskOut(BaseModel):
    id: str
    title: str
    start_at: datetime
    duration_minutes: int
    notes: str | None
    completed: bool
    completed_at: datetime | None
    source: str
    reminder_enabled: bool
    reminder: ReminderOut | None
    series_id: str | None
    # Solo en las respuestas de una tarea individual (GET/PATCH /tasks/{id}), no en los listados.
    repeat: RepeatOut | None = None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_task(cls, task: Task, series: Series | None = None) -> TaskOut:
        reminder = (
            ReminderOut(amount=task.reminder_amount, unit=task.reminder_unit)
            if task.reminder_enabled and task.reminder_amount and task.reminder_unit
            else None
        )
        return cls(
            id=task.id,
            title=task.title,
            start_at=to_utc(task.start_at),
            duration_minutes=task.duration_minutes,
            notes=task.notes,
            completed=task.completed_at is not None,
            completed_at=task.completed_at,
            source=task.source,
            reminder_enabled=task.reminder_enabled,
            reminder=reminder,
            series_id=task.series_id,
            repeat=(
                RepeatOut(kind=series.repeat_kind, days=series.repeat_days) if series else None
            ),
            created_at=task.created_at,
            updated_at=task.updated_at,
        )


class TaskList(BaseModel):
    items: list[TaskOut]
