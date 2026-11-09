"""Enmienda v2 contra Supabase **dev**: series, avisos, restricciones e idempotencia.

Solo con `uv run pytest -m integration`, con APP_ENV=dev y la migración 20261108000000 aplicada.
Todo lo que crean se borra al terminar (las series y tareas caen en cascada con el usuario).
"""

import uuid
from collections.abc import Iterator
from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from fastapi.testclient import TestClient
from postgrest.exceptions import APIError

from app.core.config import Settings, load_settings
from app.core.recurrence import add_months, horizon_end, local_to_utc
from app.db.base import DatabaseUnavailable
from app.db.supabase_repository import SupabaseRepository
from app.factory import create_app

pytestmark = pytest.mark.integration

PASSWORD = "contraseña-de-prueba-1"
BOGOTA = ZoneInfo("America/Bogota")


@pytest.fixture(scope="module")
def settings() -> Settings:
    return load_settings()


@pytest.fixture(scope="module")
def repo(settings: Settings) -> SupabaseRepository:
    return SupabaseRepository(
        settings.supabase_url,
        settings.supabase_service_role_key.get_secret_value(),
        timeout_seconds=15,
    )


@pytest.fixture
def created_users(repo: SupabaseRepository) -> Iterator[list[str]]:
    ids: list[str] = []
    yield ids
    for user_id in ids:
        repo._client.table("users").delete().eq("id", user_id).execute()


def _email() -> str:
    return f"test-{uuid.uuid4().hex[:12]}@example.com"


def _new_user(repo: SupabaseRepository, created: list[str]):
    user = repo.create_user(_email(), "h", "America/Bogota")
    created.append(user.id)
    return user


def _series(repo: SupabaseRepository, user, **overrides):
    starts_on = datetime.now(BOGOTA).date() + timedelta(days=2)
    values = dict(
        repeat_kind="daily",
        repeat_days=[1, 2, 3, 4, 5, 6, 7],
        starts_on=starts_on,
        start_minute=9 * 60,
        duration_minutes=30,
        timezone="America/Bogota",
        generated_until=horizon_end(starts_on, "America/Bogota"),
        title="Serie de prueba",
        notes=None,
        source="manual",
        reminder_amount=15,
        reminder_unit="minutes",
    )
    values.update(overrides)
    return repo.create_series(user.id, **values)


def _starts(series, count: int) -> list[datetime]:
    return [local_to_utc(series.starts_on + timedelta(days=i), 540, BOGOTA) for i in range(count)]


def test_bulk_insert_is_idempotent(repo: SupabaseRepository, created_users: list[str]) -> None:
    """D-13: insertar dos veces las mismas repeticiones no duplica ni falla."""
    user = _new_user(repo, created_users)
    series = _series(repo, user)
    starts = _starts(series, 30)
    created = repo.insert_series_tasks(series, starts)
    assert len(created) == 30
    assert [t.start_at for t in created] == sorted(starts)
    assert all(t.series_id == series.id and t.reminder_unit == "minutes" for t in created)
    assert repo.insert_series_tasks(series, starts) == []  # nada nuevo
    assert repo.count_user_tasks(user.id) == 30
    more = repo.insert_series_tasks(series, _starts(series, 35))
    assert len(more) == 5 and repo.count_user_tasks(user.id) == 35


def test_large_batches_are_split_in_chunks(
    repo: SupabaseRepository, created_users: list[str]
) -> None:
    user = _new_user(repo, created_users)
    series = _series(repo, user)
    assert len(repo.insert_series_tasks(series, _starts(series, 366))) == 366
    assert repo.count_user_tasks(user.id) == 366


def test_database_rejects_inconsistent_reminders(
    repo: SupabaseRepository, created_users: list[str]
) -> None:
    user = _new_user(repo, created_users)
    now = datetime.now(UTC)
    base = dict(title="t", start_at=now, duration_minutes=30, notes=None, source="manual")
    bad_cases = [
        dict(
            reminder_enabled=True, reminder_amount=None, reminder_unit=None
        ),  # avisa sin antelación
        dict(reminder_enabled=True, reminder_amount=15, reminder_unit=None),  # par incompleto
        dict(reminder_enabled=True, reminder_amount=0, reminder_unit="minutes"),
        dict(reminder_enabled=True, reminder_amount=61, reminder_unit="minutes"),
        dict(reminder_enabled=True, reminder_amount=5, reminder_unit="años"),
    ]
    for case in bad_cases:
        with pytest.raises(DatabaseUnavailable):
            repo.create_task(user.id, **base, **case)
    ok = repo.create_task(
        user.id, **base, reminder_enabled=True, reminder_amount=2, reminder_unit="hours"
    )
    assert (ok.reminder_amount, ok.reminder_unit, ok.series_id) == (2, "hours", None)
    off = repo.create_task(user.id, **base, reminder_enabled=False)
    assert (off.reminder_enabled, off.reminder_amount) == (False, None)


def test_series_constraints(repo: SupabaseRepository, created_users: list[str]) -> None:
    user = _new_user(repo, created_users)
    for bad in (
        dict(repeat_kind="mensual"),
        dict(repeat_days=[]),
        dict(repeat_days=[0]),
        dict(repeat_days=[8]),
        dict(start_minute=1440),
        dict(duration_minutes=4),
    ):
        with pytest.raises(DatabaseUnavailable):
            _series(repo, user, **bad)


def test_cascades(repo: SupabaseRepository) -> None:
    """Borrar el usuario borra sus series y tareas; borrar la serie borra sus tareas."""
    user = repo.create_user(_email(), "h", "America/Bogota")
    series = _series(repo, user)
    tasks = repo.insert_series_tasks(series, _starts(series, 3))
    other = _series(repo, user, title="Otra")
    other_tasks = repo.insert_series_tasks(other, _starts(other, 2))

    repo._client.table("task_series").delete().eq("id", series.id).execute()
    assert all(repo.get_task(user.id, t.id) is None for t in tasks)
    assert all(repo.get_task(user.id, t.id) is not None for t in other_tasks)

    repo._client.table("users").delete().eq("id", user.id).execute()
    assert repo.get_series(user.id, other.id) is None
    assert repo.get_task(user.id, other_tasks[0].id) is None


def test_following_empty_cleanup_and_extension_listing(
    repo: SupabaseRepository, created_users: list[str]
) -> None:
    user = _new_user(repo, created_users)
    series = _series(repo, user)
    tasks = repo.insert_series_tasks(series, _starts(series, 10))

    assert [
        s.id
        for s in repo.list_series_to_extend(user.id, series.generated_until + timedelta(days=1))
    ] == [series.id]
    assert repo.list_series_to_extend(user.id, series.generated_until - timedelta(days=1)) == []
    later = series.generated_until + timedelta(days=90)
    repo.set_series_generated_until(user.id, series.id, later)
    assert repo.get_series(user.id, series.id).generated_until == later
    assert repo.list_series_to_extend(user.id, later) == []

    assert repo.delete_tasks_following(user.id, tasks[6]) == 4
    assert repo.count_user_tasks(user.id) == 6
    kept = repo.get_series(user.id, series.id)
    assert kept is not None and kept.ends_before == tasks[6].start_at
    assert repo.list_series_to_extend(user.id, later + timedelta(days=1)) == []  # ya no se regenera

    assert repo.delete_tasks_following(user.id, tasks[0]) == 6
    assert repo.get_series(user.id, series.id) is None  # la serie vacía se elimina


def test_series_are_isolated_between_users(
    repo: SupabaseRepository, created_users: list[str]
) -> None:
    ana, beto = _new_user(repo, created_users), _new_user(repo, created_users)
    series = _series(repo, ana)
    repo.insert_series_tasks(series, _starts(series, 2))
    assert repo.get_series(beto.id, series.id) is None
    assert repo.list_series_to_extend(beto.id, series.generated_until + timedelta(days=5)) == []


def test_full_api_flow_with_a_repeating_task(
    settings: Settings, repo: SupabaseRepository, created_users: list[str]
) -> None:
    """Crear serie L–V, renovarla, completar una, mover otra y borrar «esta y las siguientes»."""
    client = TestClient(create_app(settings, repo), raise_server_exceptions=False)
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": _email(), "password": PASSWORD, "timezone": "America/Bogota"},
    )
    assert reg.status_code == 201, reg.text
    created_users.append(reg.json()["user"]["id"])
    user_id = reg.json()["user"]["id"]
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    sunday = datetime.now(BOGOTA).date()
    sunday += timedelta(days=(6 - sunday.weekday()) % 7 + 7)
    created = client.post(
        "/api/v1/tasks",
        json={
            "title": "Estudiar inglés",
            "start_at": local_to_utc(sunday, 9 * 60, BOGOTA).isoformat(),
            "duration_minutes": 60,
            "repeat": {"kind": "weekdays"},
            "reminder": {"amount": 30, "unit": "minutes"},
        },
        headers=headers,
    )
    assert created.status_code == 201, created.text
    first = created.json()
    assert first["series_id"] and first["reminder"] == {"amount": 30, "unit": "minutes"}
    assert first["repeat"] == {"kind": "weekdays", "days": [1, 2, 3, 4, 5]}
    assert first["start_at"].startswith(
        local_to_utc(sunday + timedelta(days=1), 540, BOGOTA).strftime("%Y-%m-%dT%H:%M")
    )

    week = {
        "from": local_to_utc(sunday, 0, BOGOTA).isoformat(),
        "to": local_to_utc(sunday + timedelta(days=7), 0, BOGOTA).isoformat(),
    }
    items = client.get("/api/v1/tasks", params=week, headers=headers).json()["items"]
    assert len(items) == 5 and all(i["series_id"] == first["series_id"] for i in items)

    # Renovación perezosa: un mes posterior al horizonte inicial (12 meses).
    later = add_months(sunday, 14)
    month = {
        "from": local_to_utc(later, 0, BOGOTA).isoformat(),
        "to": local_to_utc(later + timedelta(days=30), 0, BOGOTA).isoformat(),
    }
    renewed = client.get("/api/v1/tasks", params=month, headers=headers).json()["items"]
    assert len(renewed) >= 20
    total = repo.count_user_tasks(user_id)
    assert len(client.get("/api/v1/tasks", params=month, headers=headers).json()["items"]) == len(
        renewed
    )
    assert repo.count_user_tasks(user_id) == total  # sin duplicados

    # Cada repetición es independiente.
    done = client.patch(
        f"/api/v1/tasks/{items[0]['id']}", json={"completed": True}, headers=headers
    )
    assert done.json()["completed"] is True
    other = client.get(f"/api/v1/tasks/{items[1]['id']}", headers=headers).json()
    assert other["completed"] is False

    # Borrar «esta y las siguientes».
    cut = items[2]
    assert (
        client.delete(f"/api/v1/tasks/{cut['id']}?scope=following", headers=headers).status_code
        == 204
    )
    after = client.get("/api/v1/tasks", params=week, headers=headers).json()["items"]
    assert [i["id"] for i in after] == [items[0]["id"], items[1]["id"]]
    assert client.get("/api/v1/tasks", params=month, headers=headers).json()["items"] == []

    # Otra persona no puede tocar la serie.
    other_reg = client.post("/api/v1/auth/register", json={"email": _email(), "password": PASSWORD})
    created_users.append(other_reg.json()["user"]["id"])
    other_headers = {"Authorization": f"Bearer {other_reg.json()['access_token']}"}
    assert client.get(f"/api/v1/tasks/{items[0]['id']}", headers=other_headers).status_code == 404
    assert (
        client.delete(
            f"/api/v1/tasks/{items[0]['id']}?scope=following", headers=other_headers
        ).status_code
        == 404
    )


def test_unique_constraint_blocks_duplicate_series_starts(
    repo: SupabaseRepository, created_users: list[str]
) -> None:
    user = _new_user(repo, created_users)
    series = _series(repo, user)
    start = _starts(series, 1)[0]
    repo.create_task(
        user.id,
        title="a",
        start_at=start,
        duration_minutes=30,
        notes=None,
        reminder_enabled=False,
        source="manual",
        series_id=series.id,
    )
    with pytest.raises(DatabaseUnavailable):  # el índice único lo rechaza (23505)
        repo.create_task(
            user.id,
            title="b",
            start_at=start,
            duration_minutes=30,
            notes=None,
            reminder_enabled=False,
            source="manual",
            series_id=series.id,
        )
    # Las tareas sueltas (sin serie) no chocan entre sí aunque tengan la misma hora.
    for title in ("c", "d"):
        repo.create_task(
            user.id,
            title=title,
            start_at=start,
            duration_minutes=30,
            notes=None,
            reminder_enabled=False,
            source="manual",
        )


_ = (APIError, date)  # importados para claridad de los tipos de error esperados
