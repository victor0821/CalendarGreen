"""RF-011, RF-013 / CA-10, CA-12: rutas protegidas y lista blanca de rutas públicas."""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt
import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.db.memory_repository import InMemoryRepository
from app.factory import create_app
from tests.helpers import auth_headers

PUBLIC = {
    ("GET", "/api/v1/health"),
    ("POST", "/api/v1/auth/register"),
    ("POST", "/api/v1/auth/login"),
}


def _protected_routes(client: TestClient) -> list[tuple[str, str]]:
    # El esquema OpenAPI lista todas las rutas registradas, incluidas las de routers anidados.
    paths = client.app.openapi()["paths"]  # type: ignore[attr-defined]
    return [
        (method.upper(), path)
        for path, operations in paths.items()
        for method in operations
        if (method.upper(), path) not in PUBLIC
    ]


def _call(client: TestClient, method: str, path: str):
    url = path.replace("{task_id}", str(uuid4()))
    if method == "GET" and url.endswith("/tasks"):
        url += "?from=2026-01-01T00:00:00Z&to=2026-01-08T00:00:00Z"
    body = {} if method in {"POST", "PATCH"} else None
    return client.request(method, url, json=body)


def test_every_route_outside_the_whitelist_requires_a_session(client: TestClient) -> None:
    """RF-013: una ruta nueva sin protección haría fallar esta prueba."""
    routes = _protected_routes(client)
    assert routes, "no se encontraron rutas protegidas"
    for method, path in routes:
        response = _call(client, method, path)
        assert response.status_code == 401, f"{method} {path} no exige sesión"
        assert response.json()["error"]["code"] == "unauthorized"


def test_invalid_tokens_are_rejected(client: TestClient, settings: Settings) -> None:
    """CA-12: manipulado, vencido, de otra clave, malformado."""
    headers = auth_headers(client)
    good = headers["Authorization"].removeprefix("Bearer ")
    secret = settings.jwt_secret.get_secret_value()
    expired = jwt.encode(
        {"sub": str(uuid4()), "exp": datetime.now(UTC) - timedelta(minutes=1)}, secret, "HS256"
    )
    foreign = jwt.encode(
        {"sub": str(uuid4()), "exp": datetime.now(UTC) + timedelta(hours=1)}, "z" * 40, "HS256"
    )
    for bad in [good[:-4] + "xxxx", expired, foreign, "basura", "x"]:
        response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {bad}"})
        assert response.status_code == 401, bad


def test_token_of_a_deleted_user_is_rejected(settings: Settings) -> None:
    """Usuario inexistente con token vigente → 401."""
    repo = InMemoryRepository()
    client = TestClient(create_app(settings, repo), raise_server_exceptions=False)
    headers = auth_headers(client)
    repo._users.clear()
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 401


@pytest.mark.parametrize("scheme", ["Basic abc", "Token abc", "bearer"])
def test_wrong_authorization_scheme(client: TestClient, scheme: str) -> None:
    response = client.get("/api/v1/auth/me", headers={"Authorization": scheme})
    assert response.status_code == 401


def test_me_returns_the_session_user(client: TestClient) -> None:
    body = client.get("/api/v1/auth/me", headers=auth_headers(client)).json()
    assert body["email"] == "ana@correo.com"
    assert set(body) == {"id", "email", "timezone"}
