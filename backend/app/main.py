"""Punto de entrada: `cd backend && uv run uvicorn app.main:app --reload`."""

import sys

from app.core.config import ConfigError
from app.factory import create_app

try:
    app = create_app()
except ConfigError as exc:
    # CA-3: termina nombrando la variable faltante, sin imprimir valores ni trazas.
    sys.stderr.write(f"Error de configuración: {exc}\nRevisa tu .env (ver .env.example).\n")
    raise SystemExit(1) from None
