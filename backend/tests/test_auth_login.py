"""RF-007…RF-009 / CA-6…CA-8: inicio de sesión."""

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.db.memory_repository import InMemoryRepository
from app.factory import create_app
from tests.helpers import PASSWORD, register


def _login(client: TestClient, email: str, password: str):
    return client.post("/api/v1/auth/login", json={"email": email, "password": password})


def test_login_ok(client: TestClient) -> None:
    """CA-6."""
    register(client)
    response = _login(client, "ana@correo.com", PASSWORD)
    assert response.status_code == 200
    assert response.json()["access_token"]


def test_unknown_email_and_wrong_password_look_identical(client: TestClient) -> None:
    """CA-7 / RF-008: mismo estado, código y mensaje."""
    register(client)
    unknown = _login(client, "nadie@correo.com", "cualquiera123")
    wrong = _login(client, "ana@correo.com", "contraseña-mala")
    assert unknown.status_code == wrong.status_code == 401
    assert unknown.json() == wrong.json()
    assert unknown.json()["error"]["message"] == "Correo o contraseña incorrectos."


def test_malformed_login_input_is_just_invalid_credentials(client: TestClient) -> None:
    assert _login(client, "no-es-correo", "x").status_code == 401


def test_lockout_after_repeated_failures_even_with_correct_password(settings: Settings) -> None:
    """CA-8 / RF-009: 5 fallos bloquean con 429 y Retry-After."""
    client = TestClient(create_app(settings, InMemoryRepository()), raise_server_exceptions=False)
    register(client)
    for _ in range(settings.login_max_attempts):
        assert _login(client, "ana@correo.com", "mala-contraseña").status_code == 401
    blocked = _login(client, "ana@correo.com", PASSWORD)
    assert blocked.status_code == 429
    assert blocked.json()["error"]["code"] == "too_many_attempts"
    assert int(blocked.headers["Retry-After"]) > 0
    assert "minutos" in blocked.json()["error"]["message"]


def test_successful_login_resets_failures(client: TestClient, settings: Settings) -> None:
    register(client)
    for _ in range(settings.login_max_attempts - 1):
        _login(client, "ana@correo.com", "mala-contraseña")
    assert _login(client, "ana@correo.com", PASSWORD).status_code == 200
    for _ in range(settings.login_max_attempts - 1):
        assert _login(client, "ana@correo.com", "mala-contraseña").status_code == 401


def test_register_rate_limit_per_ip(settings: Settings) -> None:
    """Q-10: límite de registros por IP."""
    limited = settings.model_copy(update={"register_max_per_hour_per_ip": 2})
    client = TestClient(create_app(limited, InMemoryRepository()), raise_server_exceptions=False)
    assert register(client, "a@correo.com").status_code == 201
    assert register(client, "b@correo.com").status_code == 201
    assert register(client, "c@correo.com").status_code == 429
