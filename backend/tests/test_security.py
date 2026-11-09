"""RNF-001, RNF-002 / CA-12, CA-17: hash de contraseñas y tokens."""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt

from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)

SECRET = "s" * 40


def test_hash_is_not_the_password_and_verifies() -> None:
    hashed = hash_password("mi-contraseña-1")
    assert hashed != "mi-contraseña-1"
    assert hashed.startswith("$argon2id$")
    assert verify_password("mi-contraseña-1", hashed)
    assert not verify_password("otra", hashed)


def test_verify_against_missing_user_is_always_false() -> None:
    assert verify_password("cualquiera", None) is False


def test_token_roundtrip() -> None:
    user_id = str(uuid4())
    assert decode_access_token(create_access_token(user_id, SECRET, 60), SECRET) == user_id


def test_expired_token_is_rejected() -> None:
    token = create_access_token(str(uuid4()), SECRET, -1)
    assert decode_access_token(token, SECRET) is None


def test_tampered_or_foreign_token_is_rejected() -> None:
    token = create_access_token(str(uuid4()), SECRET, 60)
    assert decode_access_token(token, "otro" * 12) is None
    assert decode_access_token(token[:-3] + "abc", SECRET) is None
    assert decode_access_token("basura", SECRET) is None


def test_token_with_non_uuid_subject_is_rejected() -> None:
    payload = {"sub": "no-es-uuid", "exp": datetime.now(UTC) + timedelta(hours=1)}
    assert decode_access_token(jwt.encode(payload, SECRET, algorithm="HS256"), SECRET) is None


def test_unsigned_alg_none_token_is_rejected() -> None:
    payload = {"sub": str(uuid4()), "exp": datetime.now(UTC) + timedelta(hours=1)}
    assert decode_access_token(jwt.encode(payload, None, algorithm="none"), SECRET) is None
