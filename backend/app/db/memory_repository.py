"""Repositorio en memoria para pruebas unitarias sin internet (RF-010)."""

import uuid
from collections.abc import Sequence
from dataclasses import replace
from datetime import UTC, date, datetime
from typing import Any

from app.db.base import DatabaseUnavailable, UserAlreadyExists
from app.db.models import Series, Task, User


class InMemoryRepository:
    def __init__(self, *, healthy: bool = True) -> None:
        self.healthy = healthy
        self._users: dict[str, User] = {}
        self._tasks: dict[str, Task] = {}
        self._series: dict[str, Series] = {}

    def _check(self) -> None:
        if not self.healthy:
            raise DatabaseUnavailable("in-memory repository marked as unavailable")

    def ping(self) -> None:
        self._check()

    # --- usuarios ---------------------------------------------------------------------
    def create_user(self, email: str, password_hash: str, timezone: str) -> User:
        self._check()
        if any(u.email == email for u in self._users.values()):
            raise UserAlreadyExists(email)
        now = datetime.now(UTC)
        user = User(str(uuid.uuid4()), email, password_hash, timezone, now, now)
        self._users[user.id] = user
        return user

    def get_user_by_email(self, email: str) -> User | None:
        self._check()
        return next((u for u in self._users.values() if u.email == email), None)

    def get_user_by_id(self, user_id: str) -> User | None:
        self._check()
        return self._users.get(user_id)

    # --- tareas -------------------------------------------------------------------------
    def list_tasks_by_start(
        self, user_id: str, start_from: datetime, start_to: datetime
    ) -> list[Task]:
        self._check()
        found = [
            t
            for t in self._tasks.values()
            if t.user_id == user_id and start_from <= t.start_at < start_to
        ]
        return sorted(found, key=lambda t: t.start_at)

    def create_task(
        self,
        user_id: str,
        *,
        title: str,
        start_at: datetime,
        duration_minutes: int,
        notes: str | None,
        reminder_enabled: bool,
        source: str,
        reminder_amount: int | None = None,
        reminder_unit: str | None = None,
        series_id: str | None = None,
    ) -> Task:
        self._check()
        now = datetime.now(UTC)
        task = Task(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title=title,
            start_at=start_at,
            duration_minutes=duration_minutes,
            notes=notes,
            completed_at=None,
            source=source,
            reminder_enabled=reminder_enabled,
            created_at=now,
            updated_at=now,
            series_id=series_id,
            reminder_amount=reminder_amount,
            reminder_unit=reminder_unit,
        )
        self._tasks[task.id] = task
        return task

    def get_task(self, user_id: str, task_id: str) -> Task | None:
        self._check()
        task = self._tasks.get(task_id)
        return task if task and task.user_id == user_id else None

    def update_task(self, user_id: str, task_id: str, changes: dict[str, Any]) -> Task | None:
        task = self.get_task(user_id, task_id)
        if task is None:
            return None
        updated = replace(task, **changes, updated_at=datetime.now(UTC))
        self._tasks[task_id] = updated
        return updated

    def delete_task(self, user_id: str, task_id: str) -> bool:
        if self.get_task(user_id, task_id) is None:
            return False
        del self._tasks[task_id]
        return True

    def count_user_tasks(self, user_id: str) -> int:
        self._check()
        return sum(1 for t in self._tasks.values() if t.user_id == user_id)

    # --- series -------------------------------------------------------------------------
    def create_series(
        self,
        user_id: str,
        *,
        repeat_kind: str,
        repeat_days: Sequence[int],
        starts_on: date,
        start_minute: int,
        duration_minutes: int,
        timezone: str,
        generated_until: datetime,
        title: str,
        notes: str | None,
        source: str,
        reminder_amount: int | None,
        reminder_unit: str | None,
    ) -> Series:
        self._check()
        now = datetime.now(UTC)
        series = Series(
            id=str(uuid.uuid4()),
            user_id=user_id,
            repeat_kind=repeat_kind,
            repeat_days=list(repeat_days),
            starts_on=starts_on,
            start_minute=start_minute,
            duration_minutes=duration_minutes,
            timezone=timezone,
            generated_until=generated_until,
            ends_before=None,
            title=title,
            notes=notes,
            source=source,
            reminder_amount=reminder_amount,
            reminder_unit=reminder_unit,
            created_at=now,
            updated_at=now,
        )
        self._series[series.id] = series
        return series

    def get_series(self, user_id: str, series_id: str) -> Series | None:
        self._check()
        series = self._series.get(series_id)
        return series if series and series.user_id == user_id else None

    def insert_series_tasks(self, series: Series, starts: Sequence[datetime]) -> list[Task]:
        self._check()
        existing = {t.start_at for t in self._tasks.values() if t.series_id == series.id}
        created: list[Task] = []
        for start in sorted(set(starts) - existing):
            created.append(
                self.create_task(
                    series.user_id,
                    title=series.title,
                    start_at=start,
                    duration_minutes=series.duration_minutes,
                    notes=series.notes,
                    reminder_enabled=series.reminder_amount is not None,
                    source=series.source,
                    reminder_amount=series.reminder_amount,
                    reminder_unit=series.reminder_unit,
                    series_id=series.id,
                )
            )
        return created

    def list_series_to_extend(self, user_id: str, until: datetime) -> list[Series]:
        self._check()
        return [
            s
            for s in self._series.values()
            if s.user_id == user_id
            and s.generated_until < until
            and (s.ends_before is None or s.generated_until < s.ends_before)
        ]

    def set_series_generated_until(
        self, user_id: str, series_id: str, generated_until: datetime
    ) -> None:
        series = self.get_series(user_id, series_id)
        if series:
            self._series[series_id] = replace(
                series, generated_until=generated_until, updated_at=datetime.now(UTC)
            )

    def delete_tasks_following(self, user_id: str, task: Task) -> int:
        self._check()
        if task.series_id is None:
            return int(self.delete_task(user_id, task.id))
        doomed = [
            t.id
            for t in self._tasks.values()
            if t.user_id == user_id
            and t.series_id == task.series_id
            and t.start_at >= task.start_at
        ]
        for task_id in doomed:
            del self._tasks[task_id]
        series = self.get_series(user_id, task.series_id)
        if series:
            self._series[series.id] = replace(
                series, ends_before=task.start_at, updated_at=datetime.now(UTC)
            )
        self.delete_series_if_empty(user_id, task.series_id)
        return len(doomed)

    def delete_series_if_empty(self, user_id: str, series_id: str) -> None:
        self._check()
        series = self.get_series(user_id, series_id)
        if series and not any(t.series_id == series_id for t in self._tasks.values()):
            del self._series[series_id]
