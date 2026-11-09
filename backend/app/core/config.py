"""Configuración del backend, tomada solo de variables de entorno (RF-003, RF-004).

Nunca se imprimen valores: los mensajes de error nombran únicamente la variable faltante.
"""

from pathlib import Path
from typing import Literal

from pydantic import SecretStr, ValidationError, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/app/core/config.py -> raíz del repositorio
ROOT_DIR = Path(__file__).resolve().parents[3]
ENV_FILE = ROOT_DIR / ".env"


class ConfigError(Exception):
    """La configuración es inválida o incompleta (el mensaje nunca contiene valores)."""


class Settings(BaseSettings):
    # env_ignore_empty: una variable vacía se trata como ausente (RF-003).
    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        env_ignore_empty=True,
        extra="ignore",
    )

    app_env: Literal["dev", "prod"]
    supabase_url: str
    supabase_service_role_key: SecretStr
    jwt_secret: SecretStr
    jwt_expires_minutes: int = 10080  # 7 días (spec 001, Q-2)
    cors_origins: str = "http://localhost:5173"
    db_health_timeout_seconds: float = 3.0
    login_max_attempts: int = 5  # Q-4
    login_window_minutes: int = 15
    login_lock_minutes: int = 15
    register_max_per_hour_per_ip: int = 10  # Q-10

    @field_validator("jwt_secret")
    @classmethod
    def _jwt_secret_long_enough(cls, value: SecretStr) -> SecretStr:
        if len(value.get_secret_value()) < 32:
            raise ValueError("JWT_SECRET debe tener al menos 32 caracteres")
        return value

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


def load_settings(**overrides: object) -> Settings:
    """Carga la configuración o lanza ConfigError nombrando las variables con problemas."""
    try:
        return Settings(**overrides)  # type: ignore[arg-type]
    except ValidationError as exc:
        missing: list[str] = []
        invalid: list[str] = []
        for err in exc.errors():
            name = str(err["loc"][0]).upper() if err["loc"] else "?"
            (missing if err["type"] == "missing" else invalid).append(name)
        parts: list[str] = []
        if missing:
            names = ", ".join(sorted(set(missing)))
            parts.append(f"faltan variables de entorno obligatorias: {names}")
        if invalid:
            parts.append("variables con valor inválido: " + ", ".join(sorted(set(invalid))))
        raise ConfigError("; ".join(parts)) from None
