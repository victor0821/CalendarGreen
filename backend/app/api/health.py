from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import get_repository, get_settings
from app.core.config import Settings
from app.db.base import Repository

router = APIRouter(tags=["health"])


@router.get("/health")
def health(
    settings: Annotated[Settings, Depends(get_settings)],
    repository: Annotated[Repository, Depends(get_repository)],
) -> dict[str, str]:
    """Estado público del servicio (RF-001).

    Si la base falla, ping() lanza DatabaseUnavailable y la respuesta es 503 (RF-002).
    """
    repository.ping()
    return {"status": "ok", "environment": settings.app_env, "database": "ok"}
