"""Las pruebas de integración de la enmienda v2 necesitan la migración 20261108000000 en dev."""

import pytest

from app.core.config import ConfigError, load_settings
from app.db.supabase_repository import SupabaseRepository


@pytest.fixture(scope="module", autouse=True)
def require_schema_v2() -> None:
    """Omite el módulo, con un mensaje claro, si la migración v2 aún no está aplicada en dev."""
    try:
        settings = load_settings()
    except ConfigError as exc:
        pytest.skip(f"Configuración incompleta: {exc}")
    if settings.app_env != "dev":
        pytest.fail("Las pruebas de integración solo pueden correr con APP_ENV=dev (CA-5).")
    repo = SupabaseRepository(
        settings.supabase_url,
        settings.supabase_service_role_key.get_secret_value(),
        timeout_seconds=10,
    )
    try:
        repo._client.table("tasks").select("series_id,reminder_amount,reminder_unit").limit(
            1
        ).execute()
        repo._client.table("task_series").select("id").limit(1).execute()
    except Exception:  # noqa: BLE001
        pytest.skip(
            "Falta aplicar la migración 20261108000000_task_series_and_reminders.sql en dev "
            "(ver supabase/MIGRATIONS.md)."
        )
