"""Implementación de Repository sobre Supabase (RF-006, RNF-002).

Único módulo que importa supabase-py. Usa la clave de rol de servicio, que omite RLS:
solo existe en el entorno del backend. Por eso TODA consulta de tareas y series filtra por user_id.
"""

from collections.abc import Callable, Sequence
from datetime import UTC, date, datetime
from typing import Any, TypeVar

from postgrest.exceptions import APIError
from supabase import ClientOptions, create_client

from app.db.base import DatabaseUnavailable, UserAlreadyExists
from app.db.models import Series, Task, User

T = TypeVar("T")

_UNIQUE_VIOLATION = "23505"
_CHUNK = 200  # filas por petición al crear muchas repeticiones


def _dt(value: str) -> datetime:
    return datetime.fromisoformat(value).astimezone(UTC)


def _dt_opt(value: str | None) -> datetime | None:
    return _dt(value) if value else None


def _iso(value: datetime) -> str:
    return value.astimezone(UTC).isoformat()


def _to_user(row: dict[str, Any]) -> User:
    return User(
        id=row["id"],
        email=row["email"],
        password_hash=row["password_hash"],
        timezone=row["timezone"],
        created_at=_dt(row["created_at"]),
        updated_at=_dt(row["updated_at"]),
    )


def _to_task(row: dict[str, Any]) -> Task:
    return Task(
        id=row["id"],
        user_id=row["user_id"],
        title=row["title"],
        start_at=_dt(row["start_at"]),
        duration_minutes=row["duration_minutes"],
        notes=row["notes"],
        completed_at=_dt_opt(row["completed_at"]),
        source=row["source"],
        reminder_enabled=row["reminder_enabled"],
        created_at=_dt(row["created_at"]),
        updated_at=_dt(row["updated_at"]),
        series_id=row.get("series_id"),
        reminder_amount=row.get("reminder_amount"),
        reminder_unit=row.get("reminder_unit"),
    )


def _to_series(row: dict[str, Any]) -> Series:
    return Series(
        id=row["id"],
        user_id=row["user_id"],
        repeat_kind=row["repeat_kind"],
        repeat_days=[int(d) for d in row["repeat_days"]],
        starts_on=date.fromisoformat(row["starts_on"]),
        start_minute=row["start_minute"],
        duration_minutes=row["duration_minutes"],
        timezone=row["timezone"],
        generated_until=_dt(row["generated_until"]),
        ends_before=_dt_opt(row.get("ends_before")),
        title=row["title"],
        notes=row["notes"],
        source=row["source"],
        reminder_amount=row.get("reminder_amount"),
        reminder_unit=row.get("reminder_unit"),
        created_at=_dt(row["created_at"]),
        updated_at=_dt(row["updated_at"]),
    )


def _serialize(changes: dict[str, Any]) -> dict[str, Any]:
    return {k: (_iso(v) if isinstance(v, datetime) else v) for k, v in changes.items()}


class SupabaseRepository:
    def __init__(self, url: str, service_role_key: str, *, timeout_seconds: float = 3.0) -> None:
        self._client = create_client(
            url,
            service_role_key,
            options=ClientOptions(
                postgrest_client_timeout=timeout_seconds,
                auto_refresh_token=False,
                persist_session=False,
            ),
        )

    @staticmethod
    def _guard(fn: Callable[[], T]) -> T:
        """Ejecuta una consulta; cualquier fallo de red o de la base es «no disponible».

        No se propaga el detalle: puede incluir URLs o fragmentos de claves.
        """
        try:
            return fn()
        except UserAlreadyExists:
            raise
        except Exception as exc:  # noqa: BLE001
            raise DatabaseUnavailable(type(exc).__name__) from None

    def ping(self) -> None:
        self._guard(lambda: self._client.table("users").select("id").limit(1).execute())

    # --- usuarios ---------------------------------------------------------------------
    def create_user(self, email: str, password_hash: str, timezone: str) -> User:
        def run() -> User:
            try:
                res = (
                    self._client.table("users")
                    .insert({"email": email, "password_hash": password_hash, "timezone": timezone})
                    .execute()
                )
            except APIError as exc:
                if exc.code == _UNIQUE_VIOLATION:
                    raise UserAlreadyExists(email) from None
                raise
            return _to_user(res.data[0])  # type: ignore[arg-type]

        return self._guard(run)

    def get_user_by_email(self, email: str) -> User | None:
        res = self._guard(
            lambda: self._client.table("users").select("*").eq("email", email).limit(1).execute()
        )
        return _to_user(res.data[0]) if res.data else None  # type: ignore[arg-type]

    def get_user_by_id(self, user_id: str) -> User | None:
        res = self._guard(
            lambda: self._client.table("users").select("*").eq("id", user_id).limit(1).execute()
        )
        return _to_user(res.data[0]) if res.data else None  # type: ignore[arg-type]

    # --- tareas -------------------------------------------------------------------------
    def list_tasks_by_start(
        self, user_id: str, start_from: datetime, start_to: datetime
    ) -> list[Task]:
        res = self._guard(
            lambda: (
                self._client.table("tasks")
                .select("*")
                .eq("user_id", user_id)
                .gte("start_at", _iso(start_from))
                .lt("start_at", _iso(start_to))
                .order("start_at")
                .execute()
            )
        )
        return [_to_task(row) for row in res.data]  # type: ignore[arg-type]

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
        payload: dict[str, Any] = {
            "user_id": user_id,
            "title": title,
            "start_at": _iso(start_at),
            "duration_minutes": duration_minutes,
            "notes": notes,
            "reminder_enabled": reminder_enabled,
            "reminder_amount": reminder_amount,
            "reminder_unit": reminder_unit,
            "source": source,
        }
        if series_id is not None:
            payload["series_id"] = series_id
        res = self._guard(lambda: self._client.table("tasks").insert(payload).execute())
        return _to_task(res.data[0])  # type: ignore[arg-type]

    def get_task(self, user_id: str, task_id: str) -> Task | None:
        res = self._guard(
            lambda: (
                self._client.table("tasks")
                .select("*")
                .eq("id", task_id)
                .eq("user_id", user_id)
                .limit(1)
                .execute()
            )
        )
        return _to_task(res.data[0]) if res.data else None  # type: ignore[arg-type]

    def update_task(self, user_id: str, task_id: str, changes: dict[str, Any]) -> Task | None:
        payload = _serialize({**changes, "updated_at": datetime.now(UTC)})
        res = self._guard(
            lambda: (
                self._client.table("tasks")
                .update(payload)
                .eq("id", task_id)
                .eq("user_id", user_id)
                .execute()
            )
        )
        return _to_task(res.data[0]) if res.data else None  # type: ignore[arg-type]

    def delete_task(self, user_id: str, task_id: str) -> bool:
        res = self._guard(
            lambda: (
                self._client.table("tasks")
                .delete()
                .eq("id", task_id)
                .eq("user_id", user_id)
                .execute()
            )
        )
        return bool(res.data)

    def count_user_tasks(self, user_id: str) -> int:
        res = self._guard(
            lambda: (
                self._client.table("tasks")
                .select("id", count="exact")  # type: ignore[arg-type]
                .eq("user_id", user_id)
                .limit(1)
                .execute()
            )
        )
        return int(res.count or 0)

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
        payload = {
            "user_id": user_id,
            "repeat_kind": repeat_kind,
            "repeat_days": list(repeat_days),
            "starts_on": starts_on.isoformat(),
            "start_minute": start_minute,
            "duration_minutes": duration_minutes,
            "timezone": timezone,
            "generated_until": _iso(generated_until),
            "title": title,
            "notes": notes,
            "source": source,
            "reminder_amount": reminder_amount,
            "reminder_unit": reminder_unit,
        }
        res = self._guard(lambda: self._client.table("task_series").insert(payload).execute())
        return _to_series(res.data[0])  # type: ignore[arg-type]

    def get_series(self, user_id: str, series_id: str) -> Series | None:
        res = self._guard(
            lambda: (
                self._client.table("task_series")
                .select("*")
                .eq("id", series_id)
                .eq("user_id", user_id)
                .limit(1)
                .execute()
            )
        )
        return _to_series(res.data[0]) if res.data else None  # type: ignore[arg-type]

    def insert_series_tasks(self, series: Series, starts: Sequence[datetime]) -> list[Task]:
        rows = [
            {
                "user_id": series.user_id,
                "series_id": series.id,
                "title": series.title,
                "start_at": _iso(start),
                "duration_minutes": series.duration_minutes,
                "notes": series.notes,
                "source": series.source,
                "reminder_enabled": series.reminder_amount is not None,
                "reminder_amount": series.reminder_amount,
                "reminder_unit": series.reminder_unit,
            }
            for start in sorted(set(starts))
        ]
        created: list[Task] = []
        for i in range(0, len(rows), _CHUNK):
            chunk = rows[i : i + _CHUNK]
            # «Ignorar duplicados» hace idempotente la renovación (restricción única en la base).
            res = self._guard(
                lambda chunk=chunk: (
                    self._client.table("tasks")
                    .upsert(chunk, on_conflict="series_id,start_at", ignore_duplicates=True)
                    .execute()
                )
            )
            created.extend(_to_task(row) for row in res.data)  # type: ignore[arg-type]
        return sorted(created, key=lambda t: t.start_at)

    def list_series_to_extend(self, user_id: str, until: datetime) -> list[Series]:
        res = self._guard(
            lambda: (
                self._client.table("task_series")
                .select("*")
                .eq("user_id", user_id)
                .lt("generated_until", _iso(until))
                .execute()
            )
        )
        series = [_to_series(row) for row in res.data]  # type: ignore[arg-type]
        return [s for s in series if s.ends_before is None or s.generated_until < s.ends_before]

    def set_series_generated_until(
        self, user_id: str, series_id: str, generated_until: datetime
    ) -> None:
        payload = {
            "generated_until": _iso(generated_until),
            "updated_at": _iso(datetime.now(UTC)),
        }
        self._guard(
            lambda: (
                self._client.table("task_series")
                .update(payload)
                .eq("id", series_id)
                .eq("user_id", user_id)
                .execute()
            )
        )

    def delete_tasks_following(self, user_id: str, task: Task) -> int:
        if task.series_id is None:
            return int(self.delete_task(user_id, task.id))
        series_id = task.series_id
        res = self._guard(
            lambda: (
                self._client.table("tasks")
                .delete()
                .eq("user_id", user_id)
                .eq("series_id", series_id)
                .gte("start_at", _iso(task.start_at))
                .execute()
            )
        )
        payload = {"ends_before": _iso(task.start_at), "updated_at": _iso(datetime.now(UTC))}
        self._guard(
            lambda: (
                self._client.table("task_series")
                .update(payload)
                .eq("id", series_id)
                .eq("user_id", user_id)
                .execute()
            )
        )
        self.delete_series_if_empty(user_id, series_id)
        return len(res.data)

    def delete_series_if_empty(self, user_id: str, series_id: str) -> None:
        res = self._guard(
            lambda: (
                self._client.table("tasks")
                .select("id", count="exact")  # type: ignore[arg-type]
                .eq("user_id", user_id)
                .eq("series_id", series_id)
                .limit(1)
                .execute()
            )
        )
        if not res.count:
            self._guard(
                lambda: (
                    self._client.table("task_series")
                    .delete()
                    .eq("id", series_id)
                    .eq("user_id", user_id)
                    .execute()
                )
            )
