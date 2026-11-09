"""Interfaz de acceso a datos (RF-010).

Las rutas y el agente dependen de esta interfaz, nunca de un proveedor concreto.
Cada feature extiende el Protocol y sus dos implementaciones (Supabase y memoria).

Regla de seguridad: toda operación sobre tareas y series recibe `user_id` y SOLO ve o modifica
filas de ese usuario (prevención de IDOR).
"""

from collections.abc import Sequence
from datetime import date, datetime
from typing import Any, Protocol

from app.db.models import Series, Task, User


class DatabaseUnavailable(Exception):
    """La base de datos no responde, está pausada o la clave es inválida."""


class UserAlreadyExists(Exception):
    """Ya existe un usuario con ese correo."""


class Repository(Protocol):
    def ping(self) -> None:
        """Comprueba que la base responde. Lanza DatabaseUnavailable si no."""
        ...

    # --- usuarios (001) -------------------------------------------------------------
    def create_user(self, email: str, password_hash: str, timezone: str) -> User:
        """Crea un usuario. Lanza UserAlreadyExists si el correo ya está registrado."""
        ...

    def get_user_by_email(self, email: str) -> User | None: ...

    def get_user_by_id(self, user_id: str) -> User | None: ...

    # --- tareas (002) ---------------------------------------------------------------
    def list_tasks_by_start(
        self, user_id: str, start_from: datetime, start_to: datetime
    ) -> list[Task]:
        """Tareas del usuario con start_at en [start_from, start_to), ordenadas por start_at."""
        ...

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
    ) -> Task: ...

    def get_task(self, user_id: str, task_id: str) -> Task | None: ...

    def update_task(self, user_id: str, task_id: str, changes: dict[str, Any]) -> Task | None:
        """Aplica `changes` (claves de columna) y actualiza updated_at. None si no existe."""
        ...

    def delete_task(self, user_id: str, task_id: str) -> bool: ...

    def count_user_tasks(self, user_id: str) -> int:
        """Total de tareas del usuario (para el tope por usuario, Q-26)."""
        ...

    # --- series de repetición (002, enmienda v2) --------------------------------------
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
    ) -> Series: ...

    def get_series(self, user_id: str, series_id: str) -> Series | None: ...

    def insert_series_tasks(self, series: Series, starts: Sequence[datetime]) -> list[Task]:
        """Crea una tarea por cada inicio, copiando la plantilla de la serie.

        Idempotente: un inicio que ya existe en la serie se ignora (no duplica ni falla).
        Devuelve solo las tareas realmente creadas, ordenadas por inicio.
        """
        ...

    def list_series_to_extend(self, user_id: str, until: datetime) -> list[Series]:
        """Series del usuario cuyo `generated_until` es anterior a `until`."""
        ...

    def set_series_generated_until(
        self, user_id: str, series_id: str, generated_until: datetime
    ) -> None: ...

    def delete_tasks_following(self, user_id: str, task: Task) -> int:
        """Borra `task` y las posteriores de su serie; las anteriores se conservan.

        Fija `ends_before` en la serie (para no regenerar lo borrado) y la elimina si queda vacía.
        Devuelve cuántas tareas se borraron.
        """
        ...

    def delete_series_if_empty(self, user_id: str, series_id: str) -> None: ...
