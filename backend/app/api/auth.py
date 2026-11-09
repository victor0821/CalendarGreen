"""Registro, inicio de sesión y datos de la sesión (RF-001…RF-016)."""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.api.deps import (
    CurrentUser,
    get_client_ip,
    get_login_limiter,
    get_register_limiter,
    get_repository,
    get_settings,
)
from app.core.config import Settings
from app.core.errors import AppError
from app.core.rate_limit import InMemoryAttemptLimiter
from app.core.security import create_access_token, hash_password, verify_password
from app.db.base import Repository, UserAlreadyExists
from app.db.models import User
from app.schemas.auth import LoginIn, RegisterIn, TokenOut, UserOut, valid_timezone

router = APIRouter(prefix="/auth", tags=["auth"])


def _user_out(user: User) -> UserOut:
    return UserOut(id=user.id, email=user.email, timezone=user.timezone)


def _token_out(user: User, settings: Settings) -> TokenOut:
    token = create_access_token(
        user.id, settings.jwt_secret.get_secret_value(), settings.jwt_expires_minutes
    )
    return TokenOut(access_token=token, user=_user_out(user))


def _wait_message(seconds: int) -> str:
    minutes = max(1, -(-seconds // 60))
    unit = "minuto" if minutes == 1 else "minutos"
    return f"Demasiados intentos. Espera {minutes} {unit} e inténtalo de nuevo."


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(
    body: RegisterIn,
    settings: Annotated[Settings, Depends(get_settings)],
    repository: Annotated[Repository, Depends(get_repository)],
    limiter: Annotated[InMemoryAttemptLimiter, Depends(get_register_limiter)],
    ip: Annotated[str, Depends(get_client_ip)],
) -> TokenOut:
    wait = limiter.retry_after(ip)
    if wait:
        raise AppError(
            "too_many_requests",
            "Se crearon demasiadas cuentas desde esta conexión. Inténtalo más tarde.",
            429,
            {"Retry-After": str(wait)},
        )
    limiter.record_failure(ip)  # cada intento de registro cuenta contra el límite por IP
    try:
        user = repository.create_user(
            body.email, hash_password(body.password), valid_timezone(body.timezone)
        )
    except UserAlreadyExists:
        raise AppError(
            "email_already_registered", "Ese correo ya tiene una cuenta. Inicia sesión.", 409
        ) from None
    return _token_out(user, settings)


@router.post("/login")
def login(
    body: LoginIn,
    settings: Annotated[Settings, Depends(get_settings)],
    repository: Annotated[Repository, Depends(get_repository)],
    limiter: Annotated[InMemoryAttemptLimiter, Depends(get_login_limiter)],
    ip: Annotated[str, Depends(get_client_ip)],
) -> TokenOut:
    key = f"{body.email}|{ip}"
    wait = limiter.retry_after(key)
    if wait:
        raise AppError("too_many_attempts", _wait_message(wait), 429, {"Retry-After": str(wait)})
    user = repository.get_user_by_email(body.email)
    # Se verifica siempre (con un hash señuelo si no existe) para no delatar la cuenta.
    if not verify_password(body.password, user.password_hash if user else None) or user is None:
        limiter.record_failure(key)
        raise AppError("invalid_credentials", "Correo o contraseña incorrectos.", 401)
    limiter.reset(key)
    return _token_out(user, settings)


@router.get("/me")
def me(user: CurrentUser) -> UserOut:
    return _user_out(user)
