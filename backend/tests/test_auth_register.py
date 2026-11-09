"""RF-001…RF-006 / CA-1…CA-5: registro."""

import pytest
from fastapi.testclient import TestClient

from app.db.memory_repository import InMemoryRepository
from tests.helpers import PASSWORD, register


def test_register_creates_account_and_logs_in(client: TestClient) -> None:
    """CA-1: cuenta creada, token y usuario devueltos (sin hash)."""
    response = register(client)
    assert response.status_code == 201
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["email"] == "ana@correo.com"
    assert "password" not in response.text and "hash" not in response.text
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.status_code == 200


def test_email_is_normalized(client: TestClient, repository: InMemoryRepository) -> None:
    """CA-2: espacios y mayúsculas se normalizan; el login no distingue mayúsculas."""
    assert register(client, "  Ana@Correo.COM ").status_code == 201
    assert repository.get_user_by_email("ana@correo.com") is not None
    login = client.post(
        "/api/v1/auth/login", json={"email": "ANA@correo.com", "password": PASSWORD}
    )
    assert login.status_code == 200


def test_duplicate_email_conflicts_in_any_case(client: TestClient) -> None:
    """CA-3: 409 aunque cambien las mayúsculas."""
    assert register(client, "ana@correo.com").status_code == 201
    response = register(client, "ANA@Correo.com")
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "email_already_registered"


@pytest.mark.parametrize("password", ["1234567", "", "x" * 129])
def test_password_length_is_enforced(client: TestClient, password: str) -> None:
    """CA-4: 8 a 128 caracteres."""
    response = register(client, password=password)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_password_of_exactly_8_and_128_is_accepted(client: TestClient) -> None:
    assert register(client, "a@correo.com", "12345678").status_code == 201
    assert register(client, "b@correo.com", "y" * 128).status_code == 201


@pytest.mark.parametrize("email", ["sin-arroba", "a@", "@b.com", "", "a b@c.com"])
def test_invalid_email_is_rejected(client: TestClient, email: str) -> None:
    assert register(client, email).status_code == 422


def test_timezone_is_saved_or_defaults_to_bogota(
    client: TestClient, repository: InMemoryRepository
) -> None:
    """CA-5."""
    register(client, "a@correo.com", timezone="America/Mexico_City")
    register(client, "b@correo.com", timezone="Mundo/Inventado")
    register(client, "c@correo.com")
    assert repository.get_user_by_email("a@correo.com").timezone == "America/Mexico_City"
    assert repository.get_user_by_email("b@correo.com").timezone == "America/Bogota"
    assert repository.get_user_by_email("c@correo.com").timezone == "America/Bogota"


def test_password_is_stored_hashed(client: TestClient, repository: InMemoryRepository) -> None:
    """RNF-001."""
    register(client)
    user = repository.get_user_by_email("ana@correo.com")
    assert user.password_hash != PASSWORD
    assert user.password_hash.startswith("$argon2")


def test_database_down_returns_503(client: TestClient, repository: InMemoryRepository) -> None:
    repository.healthy = False
    assert register(client).status_code == 503
