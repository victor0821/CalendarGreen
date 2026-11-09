"""Errores de la API con forma única { "error": { "code", "message" } } (RF-009)."""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.db.base import DatabaseUnavailable

logger = logging.getLogger(__name__)

_HTTP_CODES = {
    401: ("unauthorized", "Necesitas iniciar sesión."),
    403: ("forbidden", "No tienes permiso para hacer esto."),
    404: ("not_found", "No se encontró lo que buscas."),
    405: ("method_not_allowed", "Método no permitido."),
    429: ("too_many_requests", "Demasiadas solicitudes. Intenta más tarde."),
}


class AppError(Exception):
    """Error de negocio con código estable y mensaje en español."""

    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        headers: dict[str, str] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.headers = headers


def error_response(
    status_code: int, code: str, message: str, headers: dict[str, str] | None = None
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message}},
        headers=headers,
    )


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError) -> JSONResponse:
        return error_response(exc.status_code, exc.code, exc.message, exc.headers)

    @app.exception_handler(DatabaseUnavailable)
    async def _db_unavailable(_: Request, exc: DatabaseUnavailable) -> JSONResponse:
        logger.warning("database_unavailable")
        return error_response(
            503,
            "database_unavailable",
            "La base de datos no responde. Puede estar pausada por inactividad.",
        )

    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, __: RequestValidationError) -> JSONResponse:
        return error_response(422, "validation_error", "Revisa los datos enviados.")

    @app.exception_handler(StarletteHTTPException)
    async def _http(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        default = ("http_error", "No se pudo completar la solicitud.")
        code, message = _HTTP_CODES.get(exc.status_code, default)
        return error_response(exc.status_code, code, message)

    @app.exception_handler(Exception)
    async def _unexpected(_: Request, exc: Exception) -> JSONResponse:
        # La traza va solo al log del servidor, nunca al cliente.
        logger.error("unhandled_exception", exc_info=exc)
        return error_response(
            500, "internal_error", "Ocurrió un error inesperado. Inténtalo de nuevo."
        )
