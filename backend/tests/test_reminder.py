"""Enmienda v2 — RF-034 / CA-26, CA-27: «Notificar» (antelación del aviso)."""

import pytest
from fastapi.testclient import TestClient

from tests.helpers import auth_headers

BASE = "/api/v1/tasks"
START = "2026-12-10T15:00:00Z"


@pytest.fixture
def headers(client: TestClient) -> dict[str, str]:
    return auth_headers(client)


def _create(client: TestClient, headers, **fields):
    return client.post(BASE, json={"title": "Aviso", "start_at": START, **fields}, headers=headers)


def test_default_is_fifteen_minutes_before(client: TestClient, headers) -> None:
    task = _create(client, headers).json()
    assert task["reminder_enabled"] is True
    assert task["reminder"] == {"amount": 15, "unit": "minutes"}


def test_explicit_null_means_no_notification(client: TestClient, headers) -> None:
    """CA-26: sin «Notificar», la tarea se guarda sin aviso."""
    task = _create(client, headers, reminder=None).json()
    assert task["reminder_enabled"] is False
    assert task["reminder"] is None


@pytest.mark.parametrize(
    ("amount", "unit"),
    [(1, "minutes"), (60, "minutes"), (2, "hours"), (60, "hours"), (28, "days"), (4, "weeks")],
)
def test_valid_reminders_are_kept_as_chosen(client: TestClient, headers, amount, unit) -> None:
    """D-16: se conserva lo que eligió el usuario («60 minutos» no se vuelve «1 hora»)."""
    task = _create(client, headers, reminder={"amount": amount, "unit": unit}).json()
    assert task["reminder"] == {"amount": amount, "unit": unit}


@pytest.mark.parametrize(
    "reminder",
    [
        {"amount": 0, "unit": "minutes"},
        {"amount": 61, "unit": "minutes"},
        {"amount": -5, "unit": "hours"},
        {"amount": 5, "unit": "weeks"},  # CA-27: más de 4 semanas
        {"amount": 29, "unit": "days"},  # más de 28 días
        {"amount": 15, "unit": "años"},
        {"amount": 15},
        {"unit": "minutes"},
        {},
    ],
)
def test_invalid_reminders_are_rejected(client: TestClient, headers, reminder) -> None:
    response = _create(client, headers, reminder=reminder)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_patch_changes_and_clears_the_reminder(client: TestClient, headers) -> None:
    task = _create(client, headers).json()
    url = f"{BASE}/{task['id']}"
    changed = client.patch(url, json={"reminder": {"amount": 3, "unit": "days"}}, headers=headers)
    assert changed.json()["reminder"] == {"amount": 3, "unit": "days"}
    cleared = client.patch(url, json={"reminder": None}, headers=headers).json()
    assert cleared["reminder"] is None and cleared["reminder_enabled"] is False
    again = client.patch(url, json={"reminder": {"amount": 1, "unit": "hours"}}, headers=headers)
    assert again.json()["reminder_enabled"] is True


def test_patch_without_reminder_does_not_touch_it(client: TestClient, headers) -> None:
    task = _create(client, headers, reminder={"amount": 2, "unit": "hours"}).json()
    after = client.patch(f"{BASE}/{task['id']}", json={"title": "Otro"}, headers=headers).json()
    assert after["reminder"] == {"amount": 2, "unit": "hours"}


def test_patch_rejects_an_invalid_reminder(client: TestClient, headers) -> None:
    task = _create(client, headers).json()
    response = client.patch(
        f"{BASE}/{task['id']}", json={"reminder": {"amount": 5, "unit": "weeks"}}, headers=headers
    )
    assert response.status_code == 422
