"""RF-001, RF-002 / CA-1, CA-2, CA-10: estado del servicio."""

from fastapi.testclient import TestClient

from app.db.memory_repository import InMemoryRepository
from tests.conftest import FAKE_KEY


def test_health_ok(client: TestClient) -> None:
    """CA-1: 200 con servicio y base «ok», sin credenciales."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "environment": "dev", "database": "ok"}


def test_health_does_not_leak_internals(client: TestClient) -> None:
    body = client.get("/api/v1/health").text
    assert FAKE_KEY not in body
    assert "supabase" not in body.lower()


def test_health_database_down_returns_503(
    client: TestClient, repository: InMemoryRepository
) -> None:
    """CA-2: 503 con el formato de error y sin trazas."""
    repository.healthy = False
    response = client.get("/api/v1/health")
    assert response.status_code == 503
    error = response.json()["error"]
    assert error["code"] == "database_unavailable"
    assert "pausada" in error["message"]
    assert "Traceback" not in response.text
    assert "in-memory" not in response.text
