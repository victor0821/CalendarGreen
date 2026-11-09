"""RF-010 / CA-10: la versión en memoria cumple la interfaz y no necesita internet."""

import pytest

from app.db.base import DatabaseUnavailable
from app.db.memory_repository import InMemoryRepository


def test_ping_ok() -> None:
    InMemoryRepository().ping()


def test_ping_fails_when_marked_unavailable() -> None:
    with pytest.raises(DatabaseUnavailable):
        InMemoryRepository(healthy=False).ping()
