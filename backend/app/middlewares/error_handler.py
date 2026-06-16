import logging

from fastapi import Request
from fastapi.responses import JSONResponse
from google.api_core.exceptions import ResourceExhausted

from app.services.gemini_service import GeminiQuotaError, GeminiServiceError

logger = logging.getLogger(__name__)

_QUOTA_MESSAGE = (
    "Đã vượt giới hạn quota Gemini API (free tier). "
    "Thử lại sau ít phút hoặc kiểm tra hạn mức tại aistudio.google.com/rate-limit."
)


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled exception at %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


async def gemini_quota_handler(request: Request, exc: GeminiQuotaError) -> JSONResponse:
    logger.warning("Gemini quota exceeded at %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(status_code=429, content={"detail": str(exc)})


async def gemini_service_error_handler(request: Request, exc: GeminiServiceError) -> JSONResponse:
    logger.error("Gemini service error at %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(status_code=502, content={"detail": str(exc)})


async def resource_exhausted_handler(request: Request, exc: ResourceExhausted) -> JSONResponse:
    logger.warning("Gemini ResourceExhausted at %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(status_code=429, content={"detail": _QUOTA_MESSAGE})
