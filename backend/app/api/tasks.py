"""CRUD de tareas acotado al usuario de la sesión (RF-008, RF-013…RF-023, RF-028…RF-034)."""

from datetime import UTC, datetime
from typing import Annotated, Any, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from pydantic import AwareDatetime

from app.api.deps import CurrentUser, get_repository
from app.core.errors import AppError
from app.core.series import create_series_with_tasks, ensure_generated
from app.core.tasks_time import overlaps, start_search_window, to_utc, valid_range
from app.db.base import Repository
from app.db.models import Task, User
from app.schemas.tasks import TaskCreate, TaskList, TaskOut, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])

Repo = Annotated[Repository, Depends(get_repository)]


def _not_found() -> AppError:
    # 404 también para tareas ajenas: no se revela que existan (RF-023).
    return AppError("not_found", "No se encontró la tarea.", 404)


def _single(repository: Repository, user: User, task: Task) -> TaskOut:
    """Respuesta de una sola tarea: incluye la regla de repetición si pertenece a una serie."""
    series = repository.get_series(user.id, task.series_id) if task.series_id else None
    return TaskOut.from_task(task, series)


@router.get("")
def list_tasks(
    user: CurrentUser,
    repository: Repo,
    from_: Annotated[AwareDatetime, Query(alias="from")],
    to: Annotated[AwareDatetime, Query()],
) -> TaskList:
    """Tareas que se solapan con [from, to) (RF-008). Renueva las series que no llegan (RF-031)."""
    range_from, range_to = to_utc(from_), to_utc(to)
    if not valid_range(range_from, range_to):
        raise AppError("validation_error", "El rango de fechas no es válido.", 422)
    ensure_generated(repository, user.id, range_to)
    candidates = repository.list_tasks_by_start(user.id, start_search_window(range_from), range_to)
    visible = [
        t for t in candidates if overlaps(t.start_at, t.duration_minutes, range_from, range_to)
    ]
    return TaskList(items=[TaskOut.from_task(t) for t in visible])


@router.post("", status_code=status.HTTP_201_CREATED)
def create_task(body: TaskCreate, user: CurrentUser, repository: Repo) -> TaskOut:
    if body.repeat is not None:
        # Crea la serie y sus repeticiones; la respuesta es la primera repetición.
        return _single(repository, user, create_series_with_tasks(repository, user, body))
    reminder = body.reminder
    task = repository.create_task(
        user.id,
        title=body.title,
        start_at=to_utc(body.start_at),
        duration_minutes=body.duration_minutes,
        notes=body.notes,
        reminder_enabled=reminder is not None,
        reminder_amount=reminder.amount if reminder else None,
        reminder_unit=reminder.unit if reminder else None,
        source=body.source,
    )
    return TaskOut.from_task(task)


@router.get("/{task_id}")
def get_task(task_id: UUID, user: CurrentUser, repository: Repo) -> TaskOut:
    task = repository.get_task(user.id, str(task_id))
    if task is None:
        raise _not_found()
    return _single(repository, user, task)


@router.patch("/{task_id}")
def update_task(task_id: UUID, body: TaskUpdate, user: CurrentUser, repository: Repo) -> TaskOut:
    current = repository.get_task(user.id, str(task_id))
    if current is None:
        raise _not_found()
    sent = body.model_fields_set
    changes: dict[str, Any] = {}
    if "title" in sent:
        changes["title"] = body.title
    if "start_at" in sent and body.start_at is not None:
        changes["start_at"] = to_utc(body.start_at)
    if "duration_minutes" in sent:
        changes["duration_minutes"] = body.duration_minutes
    if "notes" in sent:
        changes["notes"] = body.notes
    if "reminder" in sent:
        reminder = body.reminder
        changes["reminder_enabled"] = reminder is not None
        changes["reminder_amount"] = reminder.amount if reminder else None
        changes["reminder_unit"] = reminder.unit if reminder else None
    if "completed" in sent:
        if body.completed:
            changes["completed_at"] = current.completed_at or datetime.now(UTC)
        else:
            changes["completed_at"] = None
    updated = repository.update_task(user.id, str(task_id), changes)
    if updated is None:
        raise _not_found()
    return _single(repository, user, updated)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: UUID,
    user: CurrentUser,
    repository: Repo,
    scope: Annotated[Literal["this", "following"], Query()] = "this",
) -> Response:
    """Borra la tarea; con `scope=following` y una repetición, también las posteriores (RF-033)."""
    task = repository.get_task(user.id, str(task_id))
    if task is None:
        raise _not_found()
    if scope == "following" and task.series_id:
        repository.delete_tasks_following(user.id, task)
    else:
        repository.delete_task(user.id, task.id)
        if task.series_id:
            repository.delete_series_if_empty(user.id, task.series_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
