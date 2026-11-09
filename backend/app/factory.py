"""Fábrica de la aplicación. Se separa de main.py para poder crearla en pruebas
con configuración y repositorio inyectados, sin leer el .env real."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import Settings, load_settings
from app.core.errors import register_error_handlers
from app.core.logging import setup_logging
from app.core.rate_limit import InMemoryAttemptLimiter
from app.db.base import Repository


def create_app(settings: Settings | None = None, repository: Repository | None = None) -> FastAPI:
    settings = settings or load_settings()
    if repository is None:
        from app.db.supabase_repository import SupabaseRepository

        repository = SupabaseRepository(
            settings.supabase_url,
            settings.supabase_service_role_key.get_secret_value(),
            timeout_seconds=settings.db_health_timeout_seconds,
        )

    setup_logging()
    app = FastAPI(title="CalendarGreen API", docs_url=None, redoc_url=None, openapi_url=None)
    app.state.settings = settings
    app.state.repository = repository
    app.state.login_limiter = InMemoryAttemptLimiter(
        settings.login_max_attempts,
        settings.login_window_minutes * 60,
        settings.login_lock_minutes * 60,
    )
    app.state.register_limiter = InMemoryAttemptLimiter(
        settings.register_max_per_hour_per_ip, 3600, 3600
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["Authorization", "Content-Type"],
    )
    register_error_handlers(app)
    app.include_router(api_router)
    return app
