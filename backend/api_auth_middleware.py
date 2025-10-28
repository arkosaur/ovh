"""
FastAPI API Authentication Middleware
"""
import time
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseFunction
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

class APIKeyAuthMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, settings):
        super().__init__(app)
        self.settings = settings

    async def dispatch(self, request: Request, call_next: RequestResponseFunction) -> Response:
        # Only protect /api/ routes
        if not request.url.path.startswith("/api/"):
            return await call_next(request)

        # Allow CORS preflight requests
        if request.method == "OPTIONS":
            return await call_next(request)

        api_key = request.headers.get("X-API-Key")

        if not api_key:
            return JSONResponse(
                status_code=401,
                content={"error": "Missing API key", "message": "API Key is missing."},
            )

        if api_key != self.settings.API_SECRET_KEY:
            return JSONResponse(
                status_code=401,
                content={"error": "Invalid API key", "message": "API Key is invalid."},
            )

        # Optional: Timestamp validation (anti-replay)
        request_time_str = request.headers.get("X-Request-Time")
        if request_time_str:
            try:
                request_time = int(request_time_str)
                current_time = int(time.time() * 1000)
                # Allow a 5-minute window
                if abs(current_time - request_time) > 300000:
                    return JSONResponse(
                        status_code=401,
                        content={"error": "Request expired", "message": "Request timestamp is too old."},
                    )
            except (ValueError, TypeError):
                # Ignore if timestamp is invalid
                pass

        response = await call_next(request)
        return response