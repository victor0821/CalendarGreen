"""RF-009 / CA-9: todo error usa { "error": { "code", "message" } } y no expone trazas."""

from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import BaseModel

from app.core.config import Settings
from app.core.errors import AppError
from app.db.memory_repository import InMemoryRepository
from app.factory import create_app


class Item(BaseModel):
    name: str


def _app_with_test_routes(settings: Settings) -> FastAPI:
    app = create_app(settings, InMemoryRepository())

    @app.get("/boom")
    def boom() -> None:
        raise RuntimeError("detalle interno secreto")

    @app.get("/app-error")
    def app_error() -> None:
        raise AppError("custom_code", "Mensaje en español.", status_code=409)

    @app.post("/items")
    def create_item(item: Item) -> Item:
        return item

    return app


def _assert_shape(body: dict) -> None:
    assert set(body) == {"error"}
    assert set(body["error"]) == {"code", "message"}


def test_not_found_uses_error_shape(client: TestClient) -> None:
    response = client.get("/ruta-que-no-existe")
    assert response.status_code == 404
    _assert_shape(response.json())
    assert response.json()["error"]["code"] == "not_found"


def test_method_not_allowed_uses_error_shape(client: TestClient) -> None:
    response = client.post("/api/v1/health")
    assert response.status_code == 405
    _assert_shape(response.json())


def test_validation_error_is_converted(settings: Settings) -> None:
    client = TestClient(_app_with_test_routes(settings), raise_server_exceptions=False)
    response = client.post("/items", json={"nombre": "x"})
    assert response.status_code == 422
    _assert_shape(response.json())
    assert response.json()["error"]["code"] == "validation_error"


def test_unhandled_exception_returns_500_without_trace(settings: Settings) -> None:
    client = TestClient(_app_with_test_routes(settings), raise_server_exceptions=False)
    response = client.get("/boom")
    assert response.status_code == 500
    _assert_shape(response.json())
    assert response.json()["error"]["code"] == "internal_error"
    assert "detalle interno secreto" not in response.text
    assert "Traceback" not in response.text


def test_app_error_uses_its_code_and_status(settings: Settings) -> None:
    client = TestClient(_app_with_test_routes(settings), raise_server_exceptions=False)
    response = client.get("/app-error")
    assert response.status_code == 409
    assert response.json() == {"error": {"code": "custom_code", "message": "Mensaje en español."}}
