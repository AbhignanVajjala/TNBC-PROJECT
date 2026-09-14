"""Centralized error format + handlers."""
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException


class APIError(Exception):
    def __init__(self, status_code: int, code: str, message: str, details=None):
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details


def _body(code: str, message: str, details=None):
    return {"error": {"code": code, "message": message, "details": details}}


def register_error_handlers(app):
    @app.exception_handler(APIError)
    async def _api(_: Request, exc: APIError):
        return JSONResponse(status_code=exc.status_code,
                            content=_body(exc.code, exc.message, exc.details))

    @app.exception_handler(StarletteHTTPException)
    async def _http(_: Request, exc: StarletteHTTPException):
        code = {404: "not_found", 400: "bad_request", 405: "method_not_allowed"}.get(
            exc.status_code, "http_error")
        return JSONResponse(status_code=exc.status_code, content=_body(code, str(exc.detail)))

    @app.exception_handler(RequestValidationError)
    async def _val(_: Request, exc: RequestValidationError):
        return JSONResponse(status_code=400,
                            content=_body("invalid_query", "Invalid request parameters.",
                                          _serializable(exc.errors())))

    @app.exception_handler(Exception)
    async def _unexpected(_: Request, exc: Exception):
        return JSONResponse(status_code=500,
                            content=_body("internal_error", "Unexpected server error.", str(exc)))


def _serializable(errors):
    """Validation errors can contain non-JSON objects (e.g. ValueError); stringify them."""
    out = []
    for e in errors:
        e = dict(e)
        if "ctx" in e:
            e["ctx"] = {k: str(v) for k, v in e["ctx"].items()}
        out.append(e)
    return out
