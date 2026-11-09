"""Pruebas de integración contra Supabase **dev** (RF-005, RF-006, RF-023 / CA-5, CA-6, CA-7).

Se ejecutan solo con `uv run pytest -m integration`. Requieren .env con APP_ENV=dev y la
migración inicial aplicada. NUNCA corren contra prod. Todo lo que crean se borra al terminar.
"""

import uuid
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

import pytest
from dotenv import dotenv_values
from fastapi.testclient import TestClient
from postgrest.exceptions import APIError
from supabase import create_client

from app.core.config import ENV_FILE, ConfigError, Settings, load_settings
from app.db.base import DatabaseUnavailable, UserAlreadyExists
from app.db.supabase_repository import SupabaseRepository
from app.factory import create_app

pytestmark = pytest.mark.integration

PASSWORD = "contraseña-de-prueba-1"


@pytest.fixture(scope="module")
def settings() -> Settings:
    try:
        loaded = load_settings()
    except ConfigError as exc:
        pytest.skip(f"Configuración incompleta: {exc}")
    if loaded.app_env != "dev":
        pytest.fail("Las pruebas de integración solo pueden correr con APP_ENV=dev (CA-5).")
    return loaded


@pytest.fixture(scope="module")
def repo(settings: Settings) -> SupabaseRepository:
    return SupabaseRepository(
        settings.supabase_url,
        settings.supabase_service_role_key.get_secret_value(),
        timeout_seconds=10,
    )


@pytest.fixture
def created_users(repo: SupabaseRepository) -> Iterator[list[str]]:
    """Ids de usuarios de prueba; se borran al terminar (las tareas caen por CASCADE)."""
    ids: list[str] = []
    yield ids
    for user_id in ids:
        repo._client.table("users").delete().eq("id", user_id).execute()


def _email() -> str:
    return f"test-{uuid.uuid4().hex[:12]}@example.com"


def test_ping_ok(repo: SupabaseRepository) -> None:
    repo.ping()


def test_invalid_key_fails_clearly(settings: Settings) -> None:
    bad = SupabaseRepository(settings.supabase_url, "clave-invalida", timeout_seconds=5)
    with pytest.raises(DatabaseUnavailable):
        bad.ping()


def test_user_roundtrip_and_unique_email(
    repo: SupabaseRepository, created_users: list[str]
) -> None:
    email = _email()
    user = repo.create_user(email, "hash-de-prueba", "America/Bogota")
    created_users.append(user.id)
    assert repo.get_user_by_email(email).id == user.id
    assert repo.get_user_by_id(user.id).email == email
    with pytest.raises(UserAlreadyExists):
        repo.create_user(email, "otro-hash", "America/Bogota")
    assert repo.get_user_by_email("no-existe@example.com") is None


def test_email_must_be_lowercase_in_database(repo: SupabaseRepository) -> None:
    with pytest.raises(DatabaseUnavailable):  # el CHECK de la base lo rechaza
        repo.create_user("Mayusculas@Example.Test", "h", "America/Bogota")


def test_task_without_valid_user_is_rejected(repo: SupabaseRepository) -> None:
    """CA-7: una tarea sin usuario existente la rechaza la base (clave foránea)."""
    with pytest.raises(APIError) as exc:
        repo._client.table("tasks").insert(
            {
                "user_id": str(uuid.uuid4()),
                "title": "huérfana",
                "start_at": datetime.now(UTC).isoformat(),
                "reminder_enabled": False,  # aislar la clave foránea de la restricción del aviso
            }
        ).execute()
    assert exc.value.code == "23503"


def test_database_constraints(repo: SupabaseRepository, created_users: list[str]) -> None:
    user = repo.create_user(_email(), "h", "America/Bogota")
    created_users.append(user.id)
    now = datetime.now(UTC)
    for bad in (
        {"title": ""},
        {"title": "x" * 121},
        {"duration_minutes": 4},
        {"duration_minutes": 1441},
        {"source": "otro"},
    ):
        with pytest.raises(DatabaseUnavailable):
            repo.create_task(
                user.id,
                **{
                    "title": "t",
                    "start_at": now,
                    "duration_minutes": 30,
                    "notes": None,
                    "reminder_enabled": False,
                    "source": "manual",
                    **bad,
                },
            )


def test_publishable_key_cannot_read_tables(
    repo: SupabaseRepository, settings: Settings, created_users: list[str]
) -> None:
    """CA-6: con RLS activo y sin políticas, la clave pública no ve ni una fila."""
    publishable = dotenv_values(ENV_FILE).get("SUPABASE_PUBLISHABLE_KEY")
    if not publishable:
        pytest.skip("SUPABASE_PUBLISHABLE_KEY no está en .env")
    user = repo.create_user(_email(), "h", "America/Bogota")
    created_users.append(user.id)
    repo.create_task(
        user.id,
        title="secreta",
        start_at=datetime.now(UTC),
        duration_minutes=30,
        notes=None,
        reminder_enabled=True,
        reminder_amount=15,
        reminder_unit="minutes",
        source="manual",
    )
    anon = create_client(settings.supabase_url, publishable)
    for table in ("users", "tasks"):
        try:
            rows = anon.table(table).select("*").execute().data
        except APIError:
            rows = []  # también es válido que la lectura sea denegada
        assert rows == [], f"la clave pública pudo leer {table}"


def test_tasks_roundtrip_and_isolation(repo: SupabaseRepository, created_users: list[str]) -> None:
    ana = repo.create_user(_email(), "h", "America/Bogota")
    beto = repo.create_user(_email(), "h", "America/Bogota")
    created_users.extend([ana.id, beto.id])
    start = datetime(2026, 11, 10, 15, 0, tzinfo=UTC)
    task = repo.create_task(
        ana.id,
        title="de ana",
        start_at=start,
        duration_minutes=45,
        notes="nota",
        reminder_enabled=False,
        source="voice",
    )
    assert (task.title, task.duration_minutes, task.source) == ("de ana", 45, "voice")
    assert task.start_at == start and task.reminder_enabled is False

    window = (start - timedelta(days=1), start + timedelta(days=1))
    assert [t.id for t in repo.list_tasks_by_start(ana.id, *window)] == [task.id]
    assert repo.list_tasks_by_start(beto.id, *window) == []
    assert repo.get_task(beto.id, task.id) is None
    assert repo.update_task(beto.id, task.id, {"title": "robada"}) is None
    assert repo.delete_task(beto.id, task.id) is False

    done = datetime.now(UTC)
    updated = repo.update_task(ana.id, task.id, {"title": "editada", "completed_at": done})
    assert updated.title == "editada" and updated.completed_at is not None
    # created_at usa el reloj de Supabase y updated_at el del backend: solo se comprueba el cambio.
    assert updated.updated_at != task.updated_at
    reopened = repo.update_task(ana.id, task.id, {"completed_at": None})
    assert reopened.completed_at is None

    assert repo.delete_task(ana.id, task.id) is True
    assert repo.get_task(ana.id, task.id) is None


def test_deleting_a_user_cascades_to_tasks(repo: SupabaseRepository) -> None:
    user = repo.create_user(_email(), "h", "America/Bogota")
    task = repo.create_task(
        user.id,
        title="t",
        start_at=datetime.now(UTC),
        duration_minutes=30,
        notes=None,
        reminder_enabled=True,
        reminder_amount=15,
        reminder_unit="minutes",
        source="manual",
    )
    repo._client.table("users").delete().eq("id", user.id).execute()
    assert repo.get_task(user.id, task.id) is None


def test_full_api_flow_against_real_database(
    settings: Settings, repo: SupabaseRepository, created_users: list[str]
) -> None:
    """Registro, sesión y CRUD de tareas con aislamiento, de punta a punta."""
    client = TestClient(create_app(settings, repo), raise_server_exceptions=False)
    email = _email()
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": PASSWORD, "timezone": "America/Bogota"},
    )
    assert reg.status_code == 201, reg.text
    created_users.append(reg.json()["user"]["id"])
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    assert (
        client.post(
            "/api/v1/auth/register", json={"email": email, "password": PASSWORD}
        ).status_code
        == 409
    )
    login = client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})
    assert login.status_code == 200
    assert client.get("/api/v1/auth/me", headers=headers).json()["email"] == email

    start = "2026-11-10T15:00:00-05:00"
    task = client.post(
        "/api/v1/tasks",
        json={"title": "Llamar a mi hermano", "start_at": start},
        headers=headers,
    ).json()
    listed = client.get(
        "/api/v1/tasks",
        params={"from": "2026-11-10T00:00:00-05:00", "to": "2026-11-11T00:00:00-05:00"},
        headers=headers,
    ).json()["items"]
    assert [t["id"] for t in listed] == [task["id"]]

    url = f"/api/v1/tasks/{task['id']}"
    assert client.patch(url, json={"completed": True}, headers=headers).json()["completed"]
    assert (
        client.patch(url, json={"start_at": "2026-11-12T16:00:00-05:00"}, headers=headers)
        .json()["start_at"]
        .startswith("2026-11-12T21:00:00")
    )

    other = client.post("/api/v1/auth/register", json={"email": _email(), "password": PASSWORD})
    created_users.append(other.json()["user"]["id"])
    other_headers = {"Authorization": f"Bearer {other.json()['access_token']}"}
    assert client.get(url, headers=other_headers).status_code == 404

    assert client.delete(url, headers=headers).status_code == 204
    assert client.get(url, headers=headers).status_code == 404
