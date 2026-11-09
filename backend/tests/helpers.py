from typing import Any

from fastapi.testclient import TestClient

PASSWORD = "una-contraseña-segura"


def register(
    client: TestClient, email: str = "ana@correo.com", password: str = PASSWORD, **extra: Any
):
    return client.post(
        "/api/v1/auth/register", json={"email": email, "password": password, **extra}
    )


def auth_headers(
    client: TestClient, email: str = "ana@correo.com", **register_extra: Any
) -> dict[str, str]:
    """Registra (o inicia sesión con) el usuario y devuelve la cabecera Bearer."""
    response = register(client, email, **register_extra)
    if response.status_code != 201:
        response = client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})
    return {"Authorization": f"Bearer {response.json()['access_token']}"}
