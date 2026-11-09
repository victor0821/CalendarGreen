"""RF-003 y RF-004 / CA-3: falta configuración: se nombra la variable, sin valores."""

import pytest

from app.core.config import ConfigError, load_settings

SECRET = "valor-secreto-que-no-debe-aparecer"
LONG_JWT = "j" * 40


@pytest.fixture(autouse=True)
def clean_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in ("APP_ENV", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "JWT_SECRET"):
        monkeypatch.delenv(name, raising=False)


def test_missing_variables_are_named_without_values() -> None:
    with pytest.raises(ConfigError) as exc:
        load_settings(_env_file=None)
    message = str(exc.value)
    assert "APP_ENV" in message
    assert "SUPABASE_URL" in message
    assert "SUPABASE_SERVICE_ROLE_KEY" in message
    assert "JWT_SECRET" in message


def test_only_the_missing_variable_is_named(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "dev")
    monkeypatch.setenv("SUPABASE_URL", "http://x")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", SECRET)
    monkeypatch.setenv("JWT_SECRET", LONG_JWT)
    monkeypatch.delenv("SUPABASE_URL")
    with pytest.raises(ConfigError) as exc:
        load_settings(_env_file=None)
    message = str(exc.value)
    assert "SUPABASE_URL" in message
    assert "APP_ENV" not in message
    assert SECRET not in message


def test_empty_variable_is_treated_as_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "dev")
    monkeypatch.setenv("SUPABASE_URL", "")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", SECRET)
    monkeypatch.setenv("JWT_SECRET", LONG_JWT)
    with pytest.raises(ConfigError) as exc:
        load_settings(_env_file=None)
    assert "SUPABASE_URL" in str(exc.value)


def test_invalid_app_env_does_not_echo_the_value(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "staging-" + SECRET)
    monkeypatch.setenv("SUPABASE_URL", "http://x")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", SECRET)
    monkeypatch.setenv("JWT_SECRET", LONG_JWT)
    with pytest.raises(ConfigError) as exc:
        load_settings(_env_file=None)
    assert "APP_ENV" in str(exc.value)
    assert SECRET not in str(exc.value)


def test_valid_configuration_loads(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "dev")
    monkeypatch.setenv("SUPABASE_URL", "http://x")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", SECRET)
    monkeypatch.setenv("JWT_SECRET", LONG_JWT)
    settings = load_settings(_env_file=None)
    assert settings.app_env == "dev"
    assert settings.cors_origins_list == ["http://localhost:5173"]
    # La clave es un SecretStr: su repr no la revela.
    assert SECRET not in repr(settings)


def test_short_jwt_secret_is_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    """RNF-002: JWT_SECRET de menos de 32 caracteres no es válido y no se muestra."""
    monkeypatch.setenv("APP_ENV", "dev")
    monkeypatch.setenv("SUPABASE_URL", "http://x")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", SECRET)
    monkeypatch.setenv("JWT_SECRET", "corta")
    with pytest.raises(ConfigError) as exc:
        load_settings(_env_file=None)
    assert "JWT_SECRET" in str(exc.value)
    assert "corta" not in str(exc.value)
