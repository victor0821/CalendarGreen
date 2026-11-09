"""Borra de Supabase **dev** los usuarios creados por las pruebas E2E (e2e-*@example.com).

Sus tareas se borran en cascada. Se niega a correr si APP_ENV no es «dev».
Uso (desde la raíz): uv run python scripts/cleanup_e2e.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from supabase import create_client  # noqa: E402

from app.core.config import ConfigError, load_settings  # noqa: E402


def main() -> int:
    try:
        settings = load_settings()
    except ConfigError as exc:
        print(f"Configuración incompleta: {exc}")
        return 1
    if settings.app_env != "dev":
        print("Este script solo corre con APP_ENV=dev.")
        return 1

    client = create_client(
        settings.supabase_url, settings.supabase_service_role_key.get_secret_value()
    )
    rows = (
        client.table("users").select("id,email").like("email", "e2e-%@example.com").execute().data
    )
    for row in rows:
        client.table("users").delete().eq("id", row["id"]).execute()
    print(f"Usuarios E2E borrados: {len(rows)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
