from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import Settings
from app.core.errors import AppError
from app.core.rate_limit import InMemoryAttemptLimiter
from app.core.security import decode_access_token
from app.db.base import Repository
from app.db.models import User

_bearer = HTTPBearer(auto_error=False)


def get_settings(request: Request) -> Settings:
    return request.app.state.settings  # type: ignore[no-any-return]


def get_repository(request: Request) -> Repository:
    return request.app.state.repository  # type: ignore[no-any-return]


def get_login_limiter(request: Request) -> InMemoryAttemptLimiter:
    return request.app.state.login_limiter  # type: ignore[no-any-return]


def get_register_limiter(request: Request) -> InMemoryAttemptLimiter:
    return request.app.state.register_limiter  # type: ignore[no-any-return]


def get_client_ip(request: Request) -> str:
    """IP del cliente. Detrás del proxy de Render (prod) se usa X-Forwarded-For."""
    settings: Settings = request.app.state.settings
    if settings.app_env == "prod":
        forwarded = request.headers.get("x-forwarded-for", "")
        first = forwarded.split(",")[0].strip()
        if first:
            return first
    return request.client.host if request.client else "unknown"


def _unauthorized() -> AppError:
    return AppError(
        "unauthorized",
        "Tu sesión no es válida o venció. Inicia sesión de nuevo.",
        status_code=401,
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    settings: Annotated[Settings, Depends(get_settings)],
    repository: Annotated[Repository, Depends(get_repository)],
) -> User:
    """Usuario de la sesión. Toda ruta protegida depende de esta función (RF-013, RF-016)."""
    if credentials is None:
        raise _unauthorized()
    user_id = decode_access_token(credentials.credentials, settings.jwt_secret.get_secret_value())
    if user_id is None:
        raise _unauthorized()
    user = repository.get_user_by_id(user_id)
    if user is None:
        raise _unauthorized()
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
