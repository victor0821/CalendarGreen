"""Hash de contraseñas (Argon2id) y tokens JWT (RNF-001, RNF-002)."""

import uuid
from datetime import UTC, datetime, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

_hasher = PasswordHasher()  # Argon2id con parámetros por defecto de argon2-cffi
_ALGORITHM = "HS256"

# Hash de relleno: se verifica cuando el correo no existe, para que el tiempo de respuesta
# no delate si la cuenta existe (RF-008, anti-enumeración).
_DUMMY_HASH = _hasher.hash("contraseña-de-relleno-que-nadie-usa")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    """True solo si coincide. Con password_hash=None verifica contra el señuelo y devuelve False."""
    try:
        return _hasher.verify(password_hash or _DUMMY_HASH, password) and password_hash is not None
    except VerificationError, InvalidHashError:
        return False


def create_access_token(user_id: str, secret: str, expires_minutes: int) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": user_id,
        "iat": now,
        "exp": now + timedelta(minutes=expires_minutes),
    }
    return jwt.encode(payload, secret, algorithm=_ALGORITHM)


def decode_access_token(token: str, secret: str) -> str | None:
    """Devuelve el user_id si el token es válido y vigente; None en cualquier otro caso."""
    try:
        payload = jwt.decode(
            token, secret, algorithms=[_ALGORITHM], options={"require": ["exp", "sub"]}
        )
        user_id = str(payload["sub"])
        uuid.UUID(user_id)  # el sujeto debe ser un uuid
        return user_id
    except jwt.PyJWTError, ValueError, KeyError:
        return None
