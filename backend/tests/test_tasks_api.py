"""RF-008, RF-013…RF-023 / CA-5…CA-13 de la spec 002: API de tareas."""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from tests.helpers import auth_headers

BASE = "/api/v1/tasks"


def _start(days: int = 1, hour: int = 15) -> str:
    day = datetime.now(UTC).replace(hour=hour, minute=0, second=0, microsecond=0)
    return (day + timedelta(days=days)).isoformat()


def _create(client: TestClient, headers: dict[str, str], **fields):
    body = {"title": "Llamar a mi hermano", "start_at": _start(), **fields}
    return client.post(BASE, json=body, headers=headers)


@pytest.fixture
def headers(client: TestClient) -> dict[str, str]:
    return auth_headers(client)


def test_create_task_defaults(client: TestClient, headers) -> None:
    """CA-6: 30 min, origen manual, recordatorio activo, no completada."""
    response = _create(client, headers)
    assert response.status_code == 201
    task = response.json()
    assert task["duration_minutes"] == 30
    assert task["source"] == "manual"
    assert task["reminder_enabled"] is True
    assert task["completed"] is False and task["completed_at"] is None
    assert task["start_at"].endswith("Z") or task["start_at"].endswith("+00:00")
    assert "user_id" not in task


def test_create_normalizes_offsets_to_utc(client: TestClient, headers) -> None:
    """RF-024: 3:00 p. m. en Bogotá (UTC-5) se guarda como 20:00 UTC."""
    day = (datetime.now(UTC) + timedelta(days=2)).strftime("%Y-%m-%d")
    created = _create(client, headers, start_at=f"{day}T15:00:00-05:00").json()
    assert datetime.fromisoformat(created["start_at"]) == datetime.fromisoformat(
        f"{day}T20:00:00+00:00"
    )


@pytest.mark.parametrize(
    "fields",
    [
        {"title": ""},
        {"title": "   "},
        {"title": "x" * 121},
        {"notes": "n" * 1001},
        {"duration_minutes": 4},
        {"duration_minutes": 1441},
        {"start_at": "2026-11-01T15:00:00"},  # sin zona horaria
        {"start_at": "no-es-fecha"},
        {"start_at": "2060-01-01T00:00:00Z"},  # fuera de ±5 años
        {"source": "otro"},
    ],
)
def test_create_validation(client: TestClient, headers, fields) -> None:
    """CA-7 / RF-021."""
    response = _create(client, headers, **fields)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_title_is_trimmed_and_blank_notes_become_null(client: TestClient, headers) -> None:
    task = _create(client, headers, title="  Estudiar  ", notes="   ").json()
    assert task["title"] == "Estudiar"
    assert task["notes"] is None


def test_boundaries_are_accepted(client: TestClient, headers) -> None:
    assert _create(client, headers, title="x" * 120, duration_minutes=5).status_code == 201
    assert _create(client, headers, notes="n" * 1000, duration_minutes=1440).status_code == 201


def test_past_dates_are_allowed_in_manual_form(client: TestClient, headers) -> None:
    """RF-022."""
    assert _create(client, headers, start_at=_start(days=-10)).status_code == 201


def test_get_update_complete_reopen_delete(client: TestClient, headers) -> None:
    """CA-8, CA-10, CA-11."""
    task = _create(client, headers).json()
    url = f"{BASE}/{task['id']}"
    assert client.get(url, headers=headers).json()["title"] == "Llamar a mi hermano"

    edited = client.patch(
        url, json={"title": "Llamar al dentista", "duration_minutes": 60}, headers=headers
    ).json()
    assert edited["title"] == "Llamar al dentista"
    assert edited["duration_minutes"] == 60
    assert edited["source"] == "manual"

    done = client.patch(url, json={"completed": True}, headers=headers).json()
    assert done["completed"] is True and done["completed_at"]
    reopened = client.patch(url, json={"completed": False}, headers=headers).json()
    assert reopened["completed"] is False and reopened["completed_at"] is None

    assert client.delete(url, headers=headers).status_code == 204
    assert client.get(url, headers=headers).status_code == 404
    assert client.delete(url, headers=headers).status_code == 404


def test_patch_cannot_change_source_or_null_required_fields(client: TestClient, headers) -> None:
    task = _create(client, headers).json()
    url = f"{BASE}/{task['id']}"
    assert client.patch(url, json={"title": None}, headers=headers).status_code == 422
    assert client.patch(url, json={"start_at": None}, headers=headers).status_code == 422
    client.patch(url, json={"source": "voice"}, headers=headers)  # se ignora
    assert client.get(url, headers=headers).json()["source"] == "manual"


def test_patch_can_clear_notes(client: TestClient, headers) -> None:
    task = _create(client, headers, notes="algo").json()
    url = f"{BASE}/{task['id']}"
    assert client.patch(url, json={"notes": None}, headers=headers).json()["notes"] is None


def test_move_task_keeps_duration(client: TestClient, headers) -> None:
    """RF-016 / CA-9 (parte API)."""
    task = _create(client, headers, duration_minutes=90).json()
    new_start = _start(days=3, hour=16)
    moved = client.patch(
        f"{BASE}/{task['id']}", json={"start_at": new_start}, headers=headers
    ).json()
    assert datetime.fromisoformat(moved["start_at"]) == datetime.fromisoformat(new_start)
    assert moved["duration_minutes"] == 90


def test_unknown_or_malformed_id(client: TestClient, headers) -> None:
    assert client.get(f"{BASE}/{uuid4()}", headers=headers).status_code == 404
    assert client.get(f"{BASE}/no-es-uuid", headers=headers).status_code == 422
    assert client.patch(f"{BASE}/{uuid4()}", json={}, headers=headers).status_code == 404


def test_database_down_returns_503(client: TestClient, repository, headers) -> None:
    repository.healthy = False
    assert client.get(f"{BASE}/{uuid4()}", headers=headers).status_code == 503
