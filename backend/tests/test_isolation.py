"""RF-016, RF-023 / CA-14 (001), CA-12 (002): un usuario nunca ve ni modifica datos de otro."""

import pytest
from fastapi.testclient import TestClient

from tests.helpers import auth_headers

BASE = "/api/v1/tasks"
RANGE = {"from": "2026-11-01T00:00:00Z", "to": "2026-11-30T00:00:00Z"}


@pytest.fixture
def users(client: TestClient) -> tuple[dict[str, str], dict[str, str]]:
    return auth_headers(client, "ana@correo.com"), auth_headers(client, "beto@correo.com")


def _create(client: TestClient, headers, title: str) -> dict:
    response = client.post(
        BASE, json={"title": title, "start_at": "2026-11-10T15:00:00Z"}, headers=headers
    )
    assert response.status_code == 201
    return response.json()


def test_each_user_lists_only_their_tasks(client: TestClient, users) -> None:
    ana, beto = users
    _create(client, ana, "de-ana")
    _create(client, beto, "de-beto")
    ana_items = client.get(BASE, params=RANGE, headers=ana).json()["items"]
    beto_items = client.get(BASE, params=RANGE, headers=beto).json()["items"]
    assert [t["title"] for t in ana_items] == ["de-ana"]
    assert [t["title"] for t in beto_items] == ["de-beto"]


def test_user_cannot_read_edit_or_delete_anothers_task(client: TestClient, users) -> None:
    ana, beto = users
    task = _create(client, ana, "privada")
    url = f"{BASE}/{task['id']}"

    assert client.get(url, headers=beto).status_code == 404
    assert client.patch(url, json={"title": "hackeada"}, headers=beto).status_code == 404
    assert client.patch(url, json={"completed": True}, headers=beto).status_code == 404
    assert client.delete(url, headers=beto).status_code == 404

    intact = client.get(url, headers=ana).json()
    assert intact["title"] == "privada" and intact["completed"] is False


def test_foreign_task_is_indistinguishable_from_a_missing_one(client: TestClient, users) -> None:
    """RF-023: misma respuesta para «ajena» y «no existe» (no se revela su existencia)."""
    ana, beto = users
    task = _create(client, ana, "privada")
    foreign = client.get(f"{BASE}/{task['id']}", headers=beto)
    missing = client.get(f"{BASE}/00000000-0000-4000-8000-000000000000", headers=beto)
    assert foreign.status_code == missing.status_code == 404
    assert foreign.json() == missing.json()


def test_user_id_in_the_body_is_ignored(client: TestClient, users) -> None:
    ana, beto = users
    response = client.post(
        BASE,
        json={"title": "x", "start_at": "2026-11-10T15:00:00Z", "user_id": "otro"},
        headers=ana,
    )
    assert response.status_code == 201
    assert client.get(BASE, params=RANGE, headers=beto).json()["items"] == []


def test_responses_never_include_secrets(client: TestClient, users) -> None:
    """CA-17 (001): ni contraseñas ni hashes en ninguna respuesta."""
    ana, _ = users
    _create(client, ana, "t")
    for response in (
        client.get("/api/v1/auth/me", headers=ana),
        client.get(BASE, params=RANGE, headers=ana),
    ):
        assert "argon2" not in response.text
        assert "password" not in response.text
