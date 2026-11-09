"""RF-014 / CA-4: sin secretos en el repositorio y con plantilla de configuración sin valores."""

import re
import subprocess
from pathlib import Path

import pytest

from app.core.config import ROOT_DIR

# Patrones de credenciales reales (claves de Supabase, JWT y API keys de Google).
SECRET_PATTERNS = [
    re.compile(r"sb_secret_[A-Za-z0-9_\-]{10,}"),
    re.compile(r"eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}"),
    re.compile(r"AIza[0-9A-Za-z_\-]{30,}"),
]


def _tracked_files() -> list[Path]:
    try:
        out = subprocess.run(
            ["git", "ls-files"], cwd=ROOT_DIR, capture_output=True, text=True, check=True
        ).stdout
    except OSError, subprocess.CalledProcessError:
        pytest.skip("git no disponible o no es un repositorio")
    return [ROOT_DIR / line for line in out.splitlines() if line]


def test_env_is_ignored_and_not_tracked() -> None:
    gitignore = (ROOT_DIR / ".gitignore").read_text(encoding="utf-8").splitlines()
    assert ".env" in [line.strip() for line in gitignore]
    assert ROOT_DIR / ".env" not in _tracked_files()


def test_env_example_has_no_values() -> None:
    lines = (ROOT_DIR / ".env.example").read_text(encoding="utf-8").splitlines()
    for line in lines:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        name, _, rest = line.partition("=")
        value = rest.split("#", 1)[0].strip()
        if name.strip() in {"CORS_ORIGINS", "DB_HEALTH_TIMEOUT_SECONDS"}:
            continue  # valores por defecto no sensibles
        assert value == "", f"{name.strip()} no debe tener valor en .env.example"


def test_no_credentials_in_tracked_files() -> None:
    offenders: list[str] = []
    for path in _tracked_files():
        if not path.is_file() or path.suffix in {".png", ".jpg", ".lock"}:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError, OSError:
            continue
        for pattern in SECRET_PATTERNS:
            if pattern.search(text):
                offenders.append(str(path.relative_to(ROOT_DIR)))
                break
    assert offenders == [], f"posibles credenciales en: {offenders}"
