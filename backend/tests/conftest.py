import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.db.memory_repository import InMemoryRepository
from app.factory import create_app

FAKE_KEY = "clave-falsa-solo-para-pruebas"
JWT_SECRET = "secreto-de-pruebas-de-al-menos-32-caracteres-xxxx"


@pytest.fixture
def settings() -> Settings:
    # Valores explícitos y sin leer el .env real (las pruebas no tocan dev ni prod).
    return Settings(
        _env_file=None,
        app_env="dev",
        supabase_url="http://localhost:54321",
        supabase_service_role_key=FAKE_KEY,
        jwt_secret=JWT_SECRET,
        register_max_per_hour_per_ip=1000,  # las pruebas crean muchas cuentas desde una IP
    )


@pytest.fixture
def repository() -> InMemoryRepository:
    return InMemoryRepository()


@pytest.fixture
def client(settings: Settings, repository: InMemoryRepository) -> TestClient:
    # raise_server_exceptions=False: se comprueba la respuesta 500 en vez de relanzar.
    return TestClient(create_app(settings, repository), raise_server_exceptions=False)
