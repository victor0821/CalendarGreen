"""Enmienda v2 — RF-029…RF-033 / CA-22…CA-25: tareas que se repiten."""

from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from fastapi.testclient import TestClient

from app.core import series as series_module
from app.core.recurrence import add_months, local_to_utc
from app.core.series import ensure_generated
from app.db.memory_repository import InMemoryRepository
from tests.helpers import auth_headers

BASE = "/api/v1/tasks"
BOGOTA = ZoneInfo("America/Bogota")


@pytest.fixture
def headers(client: TestClient) -> dict[str, str]:
    return auth_headers(client)


def _next_sunday() -> date:
    today = datetime.now(BOGOTA).date()
    return today + timedelta(days=(6 - today.weekday()) % 7 + 7)  # un domingo, no pasado


def _iso(day: date, minute: int = 9 * 60, tz: ZoneInfo = BOGOTA) -> str:
    return local_to_utc(day, minute, tz).isoformat()


def _create(client: TestClient, headers, day: date, repeat: dict | None, **fields):
    body = {"title": "Estudiar inglés", "start_at": _iso(day), **fields}
    if repeat is not None:
        body["repeat"] = repeat
    return client.post(BASE, json=body, headers=headers)


def _series_tasks(repo: InMemoryRepository, series_id: str):
    return sorted(
        (t for t in repo._tasks.values() if t.series_id == series_id), key=lambda t: t.start_at
    )


def _local_day(task, tz: ZoneInfo = BOGOTA) -> date:
    return task.start_at.astimezone(tz).date()


def test_no_repeat_creates_a_plain_task(client: TestClient, headers) -> None:
    task = _create(client, headers, _next_sunday(), None).json()
    assert task["series_id"] is None
    assert task["repeat"] is None


def test_weekdays_from_a_sunday_start_on_monday(
    client: TestClient, repository: InMemoryRepository, headers
) -> None:
    """CA-22: el domingo no genera tarea; la primera es el lunes; todas a la misma hora local."""
    sunday = _next_sunday()
    response = _create(client, headers, sunday, {"kind": "weekdays"})
    assert response.status_code == 201
    first = response.json()
    tasks = _series_tasks(repository, first["series_id"])
    assert first["id"] == tasks[0].id
    assert _local_day(tasks[0]) == sunday + timedelta(days=1)
    assert all(_local_day(t).isoweekday() <= 5 for t in tasks)
    assert all(t.start_at.astimezone(BOGOTA).hour == 9 for t in tasks)
    assert 255 <= len(tasks) <= 265
    assert _local_day(tasks[-1]) <= add_months(sunday, 12)
    assert first["repeat"] == {"kind": "weekdays", "days": [1, 2, 3, 4, 5]}


def test_custom_days_like_the_design(client: TestClient, repository, headers) -> None:
    """CA-21/22: L, M, X y V desde un domingo."""
    first = _create(
        client, headers, _next_sunday(), {"kind": "custom", "days": [5, 1, 3, 2]}
    ).json()
    tasks = _series_tasks(repository, first["series_id"])
    assert {_local_day(t).isoweekday() for t in tasks} == {1, 2, 3, 5}
    assert first["repeat"]["days"] == [1, 2, 3, 5]  # se guardan ordenados


def test_weekly_repeats_on_the_weekday_of_the_date(client: TestClient, repository, headers) -> None:
    sunday = _next_sunday()
    first = _create(client, headers, sunday, {"kind": "weekly"}).json()
    tasks = _series_tasks(repository, first["series_id"])
    assert {_local_day(t).isoweekday() for t in tasks} == {7}
    assert _local_day(tasks[0]) == sunday
    assert len(tasks) in (52, 53)


def test_daily_creates_about_a_year(client: TestClient, repository, headers) -> None:
    first = _create(client, headers, _next_sunday(), {"kind": "daily"}).json()
    assert 365 <= len(_series_tasks(repository, first["series_id"])) <= 367


@pytest.mark.parametrize(
    "repeat",
    [
        {"kind": "custom"},
        {"kind": "custom", "days": []},
        {"kind": "custom", "days": [0]},
        {"kind": "custom", "days": [8]},
        {"kind": "custom", "days": [1, 1]},
        {"kind": "mensual"},
    ],
)
def test_invalid_repeat_is_rejected(client: TestClient, headers, repeat) -> None:
    response = _create(client, headers, _next_sunday(), repeat)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_series_keeps_the_template(client: TestClient, repository, headers) -> None:
    first = _create(
        client,
        headers,
        _next_sunday(),
        {"kind": "daily"},
        notes="Llevar libro",
        duration_minutes=45,
        reminder={"amount": 2, "unit": "hours"},
    ).json()
    for t in _series_tasks(repository, first["series_id"])[:5]:
        assert (t.title, t.notes, t.duration_minutes) == ("Estudiar inglés", "Llevar libro", 45)
        assert (t.reminder_enabled, t.reminder_amount, t.reminder_unit) == (True, 2, "hours")


def test_same_local_time_across_dst_for_another_timezone(client: TestClient, repository) -> None:
    """D-14: una persona en Nueva York conserva 9:00 a. m. locales aunque cambie el horario."""
    ny = ZoneInfo("America/New_York")
    ny_headers = auth_headers(client, "ny@correo.com", timezone="America/New_York")
    start = datetime.now(ny).date() + timedelta(days=1)
    first = client.post(
        BASE,
        json={"title": "NY", "start_at": _iso(start, 9 * 60, ny), "repeat": {"kind": "daily"}},
        headers=ny_headers,
    ).json()
    tasks = _series_tasks(repository, first["series_id"])
    assert {t.start_at.astimezone(ny).hour for t in tasks} == {9}
    assert len({t.start_at.hour for t in tasks}) == 2  # en UTC cambia: 13 y 14


# --- Renovación perezosa (RF-031, CA-23) -------------------------------------------------


def _range_params(day: date) -> dict[str, str]:
    start = local_to_utc(day, 0, BOGOTA)
    return {"from": start.isoformat(), "to": (start + timedelta(days=31)).isoformat()}


def test_listing_a_later_period_renews_the_series(client: TestClient, repository, headers) -> None:
    """CA-23: al navegar más allá de lo cubierto aparecen las tareas, sin duplicados."""
    first = _create(client, headers, _next_sunday(), {"kind": "daily"}).json()
    sid = first["series_id"]
    initial = len(_series_tasks(repository, sid))
    later = add_months(_next_sunday(), 14)  # 2 meses después del horizonte inicial

    items = client.get(BASE, params=_range_params(later), headers=headers).json()["items"]
    assert len(items) >= 28  # un mes casi completo de «todos los días»
    renewed = len(_series_tasks(repository, sid))
    assert renewed > initial

    again = client.get(BASE, params=_range_params(later), headers=headers).json()["items"]
    assert len(again) == len(items)
    assert len(_series_tasks(repository, sid)) == renewed  # no duplica


def test_renewal_is_idempotent_even_if_called_twice(repository: InMemoryRepository) -> None:
    """D-13: dos peticiones a la vez no duplican."""
    user = repository.create_user("a@correo.com", "h", "America/Bogota")
    from app.core.recurrence import horizon_end

    starts_on = _next_sunday()
    until = horizon_end(starts_on, "America/Bogota")
    series = repository.create_series(
        user.id,
        repeat_kind="daily",
        repeat_days=[1, 2, 3, 4, 5, 6, 7],
        starts_on=starts_on,
        start_minute=540,
        duration_minutes=30,
        timezone="America/Bogota",
        generated_until=until,
        title="x",
        notes=None,
        source="manual",
        reminder_amount=None,
        reminder_unit=None,
    )
    target = until + timedelta(days=60)
    ensure_generated(repository, user.id, target)
    count = len(_series_tasks(repository, series.id))
    ensure_generated(repository, user.id, target)
    assert len(_series_tasks(repository, series.id)) == count
    assert repository.get_series(user.id, series.id).generated_until >= target


def test_renewal_never_goes_past_the_saveable_limit(repository: InMemoryRepository) -> None:
    user = repository.create_user("a@correo.com", "h", "America/Bogota")
    from app.core.recurrence import horizon_end

    starts_on = _next_sunday()
    until = horizon_end(starts_on, "America/Bogota")
    repository.create_series(
        user.id,
        repeat_kind="weekly",
        repeat_days=[7],
        starts_on=starts_on,
        start_minute=540,
        duration_minutes=30,
        timezone="America/Bogota",
        generated_until=until,
        title="x",
        notes=None,
        source="manual",
        reminder_amount=None,
        reminder_unit=None,
    )
    ensure_generated(repository, user.id, datetime.now(UTC) + timedelta(days=365 * 20))
    last = max(t.start_at for t in repository._tasks.values())
    assert last <= datetime.now(UTC) + timedelta(days=5 * 366)


def test_renewal_failure_does_not_break_the_listing(
    client: TestClient, repository, headers, monkeypatch
) -> None:
    from app.db.base import DatabaseUnavailable

    _create(client, headers, _next_sunday(), {"kind": "weekly"})

    def boom(*_a, **_k):
        raise DatabaseUnavailable("x")

    monkeypatch.setattr(repository, "list_series_to_extend", boom)
    response = client.get(BASE, params=_range_params(_next_sunday()), headers=headers)
    assert response.status_code == 200


# --- Independencia (RF-032, CA-24) -----------------------------------------------------


def test_each_repetition_is_independent(client: TestClient, repository, headers) -> None:
    first = _create(client, headers, _next_sunday(), {"kind": "weekly"}).json()
    sid = first["series_id"]
    tasks = _series_tasks(repository, sid)
    a, b, c = tasks[0], tasks[1], tasks[2]

    client.patch(f"{BASE}/{a.id}", json={"completed": True}, headers=headers)
    new_start = (b.start_at + timedelta(hours=3)).isoformat()
    client.patch(
        f"{BASE}/{b.id}", json={"start_at": new_start, "title": "Cambiada"}, headers=headers
    )

    after = {t.id: t for t in _series_tasks(repository, sid)}
    assert after[a.id].completed_at is not None
    assert after[b.id].title == "Cambiada" and after[b.id].start_at == b.start_at + timedelta(
        hours=3
    )
    assert after[c.id].completed_at is None and after[c.id].title == "Estudiar inglés"
    assert after[c.id].start_at == c.start_at
    assert all(t.series_id == sid for t in after.values())  # sigue siendo de la serie


def test_get_one_returns_the_repeat_rule_but_listings_do_not(client: TestClient, headers) -> None:
    first = _create(client, headers, _next_sunday(), {"kind": "custom", "days": [2, 4]}).json()
    one = client.get(f"{BASE}/{first['id']}", headers=headers).json()
    assert one["repeat"] == {"kind": "custom", "days": [2, 4]}
    listed = client.get(BASE, params=_range_params(_next_sunday()), headers=headers).json()["items"]
    assert listed and all(item["repeat"] is None for item in listed)
    assert all(item["series_id"] == first["series_id"] for item in listed)


def test_patch_cannot_change_the_repeat_rule(client: TestClient, repository, headers) -> None:
    first = _create(client, headers, _next_sunday(), {"kind": "weekly"}).json()
    client.patch(f"{BASE}/{first['id']}", json={"repeat": {"kind": "daily"}}, headers=headers)
    assert repository.get_series(first_user(repository), first["series_id"]).repeat_kind == "weekly"


def first_user(repository: InMemoryRepository) -> str:
    return next(iter(repository._users))


# --- Borrar (RF-033, CA-25) ----------------------------------------------------------------


def test_delete_this_removes_only_that_repetition(client: TestClient, repository, headers) -> None:
    first = _create(client, headers, _next_sunday(), {"kind": "weekly"}).json()
    sid = first["series_id"]
    tasks = _series_tasks(repository, sid)
    before = len(tasks)
    assert client.delete(f"{BASE}/{tasks[3].id}", headers=headers).status_code == 204
    remaining = _series_tasks(repository, sid)
    assert len(remaining) == before - 1
    assert tasks[3].id not in {t.id for t in remaining}


def test_delete_following_keeps_the_earlier_ones(client: TestClient, repository, headers) -> None:
    """CA-25."""
    first = _create(client, headers, _next_sunday(), {"kind": "weekly"}).json()
    sid = first["series_id"]
    tasks = _series_tasks(repository, sid)
    cut = tasks[5]
    response = client.delete(f"{BASE}/{cut.id}?scope=following", headers=headers)
    assert response.status_code == 204
    remaining = _series_tasks(repository, sid)
    assert [t.id for t in remaining] == [t.id for t in tasks[:5]]
    series = repository.get_series(first_user(repository), sid)
    assert series.ends_before == cut.start_at


def test_deleted_repetitions_are_never_regenerated(client: TestClient, repository, headers) -> None:
    first = _create(client, headers, _next_sunday(), {"kind": "weekly"}).json()
    sid = first["series_id"]
    cut = _series_tasks(repository, sid)[5]
    client.delete(f"{BASE}/{cut.id}?scope=following", headers=headers)
    count = len(_series_tasks(repository, sid))
    far = add_months(_next_sunday(), 20)
    client.get(BASE, params=_range_params(far), headers=headers)
    assert len(_series_tasks(repository, sid)) == count


def test_deleting_everything_removes_the_series(client: TestClient, repository, headers) -> None:
    first = _create(client, headers, _next_sunday(), {"kind": "weekly"}).json()
    sid = first["series_id"]
    first_task = _series_tasks(repository, sid)[0]
    client.delete(f"{BASE}/{first_task.id}?scope=following", headers=headers)
    assert _series_tasks(repository, sid) == []
    assert repository.get_series(first_user(repository), sid) is None


def test_deleting_the_last_remaining_repetition_removes_the_series(
    client: TestClient, repository, headers
) -> None:
    first = _create(client, headers, _next_sunday(), {"kind": "weekly"}).json()
    sid = first["series_id"]
    tasks = _series_tasks(repository, sid)
    for t in tasks[:-1]:
        client.delete(f"{BASE}/{t.id}", headers=headers)
    assert repository.get_series(first_user(repository), sid) is not None
    client.delete(f"{BASE}/{tasks[-1].id}", headers=headers)
    assert repository.get_series(first_user(repository), sid) is None


def test_following_on_a_plain_task_behaves_like_this(
    client: TestClient, repository, headers
) -> None:
    task = _create(client, headers, _next_sunday(), None).json()
    assert client.delete(f"{BASE}/{task['id']}?scope=following", headers=headers).status_code == 204
    assert client.get(f"{BASE}/{task['id']}", headers=headers).status_code == 404


def test_invalid_scope_is_rejected(client: TestClient, headers) -> None:
    task = _create(client, headers, _next_sunday(), None).json()
    assert client.delete(f"{BASE}/{task['id']}?scope=todo", headers=headers).status_code == 422


# --- Aislamiento y límites ---------------------------------------------------------------------


def test_other_users_cannot_touch_a_series(client: TestClient, repository, headers) -> None:
    first = _create(client, headers, _next_sunday(), {"kind": "weekly"}).json()
    sid = first["series_id"]
    beto = auth_headers(client, "beto@correo.com")
    url = f"{BASE}/{first['id']}"
    assert client.get(url, headers=beto).status_code == 404
    assert client.delete(f"{url}?scope=following", headers=beto).status_code == 404
    assert client.patch(url, json={"completed": True}, headers=beto).status_code == 404
    assert len(_series_tasks(repository, sid)) >= 52
    items = client.get(BASE, params=_range_params(_next_sunday()), headers=beto).json()["items"]
    assert items == []


def test_per_user_task_limit(client: TestClient, headers, monkeypatch) -> None:
    """Q-26: no se crean más tareas de las permitidas por usuario."""
    monkeypatch.setattr(series_module, "MAX_TASKS_PER_USER", 100)
    response = _create(client, headers, _next_sunday(), {"kind": "daily"})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "too_many_tasks"
    assert _create(client, headers, _next_sunday(), {"kind": "weekly"}).status_code == 201


def test_series_creation_when_database_is_down(client: TestClient, repository, headers) -> None:
    repository.healthy = False
    assert _create(client, headers, _next_sunday(), {"kind": "weekly"}).status_code == 503
