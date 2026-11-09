"""Esquemas de autenticación (RF-001…RF-007)."""

from typing import Annotated
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, EmailStr, Field, StringConstraints, field_validator

DEFAULT_TIMEZONE = "America/Bogota"


def normalize_email(value: object) -> object:
    return value.strip().lower() if isinstance(value, str) else value


def valid_timezone(name: str | None) -> str:
    """Zona IANA válida o, si falta o no existe, America/Bogota (RF-005)."""
    if not name:
        return DEFAULT_TIMEZONE
    try:
        ZoneInfo(name)
    except ZoneInfoNotFoundError, ValueError, OSError:
        return DEFAULT_TIMEZONE
    return name


class RegisterIn(BaseModel):
    email: EmailStr
    password: Annotated[str, StringConstraints(min_length=8, max_length=128)]
    timezone: str | None = None

    @field_validator("email", mode="before")
    @classmethod
    def _normalize(cls, value: object) -> object:
        return normalize_email(value)


class LoginIn(BaseModel):
    # Sin validación estricta de formato: cualquier dato inválido es «credenciales incorrectas».
    email: Annotated[str, StringConstraints(max_length=254)]
    password: Annotated[str, StringConstraints(max_length=1024)]

    @field_validator("email", mode="before")
    @classmethod
    def _normalize(cls, value: object) -> object:
        return normalize_email(value)


class UserOut(BaseModel):
    id: str
    email: str
    timezone: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = Field(default="bearer")
    user: UserOut
