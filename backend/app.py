"""
The Stickmen Hub backend (FastAPI, sync). Serves the hub + games same-origin and
the /api contract the Don't Look Down frontend expects.

Route order matters (T10): /api routes are registered FIRST, static mounts LAST,
so the API is never shadowed by the static file server.
"""
import logging
import os
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import OperationalError

from .routes.auth_routes import router as auth_router
from .routes.game_routes import router as game_router

REPO = Path(__file__).resolve().parent.parent
log = logging.getLogger("stickmenhub")

app = FastAPI(title="The Stickmen Hub")


@app.on_event("startup")
def _maybe_init_db():
    """First deploy convenience: if AUTO_INIT_DB=1, create tables + seed on boot.
    Idempotent. Leave unset once Alembic migrations are in place."""
    if os.getenv("AUTO_INIT_DB") == "1":
        from .db import engine, SessionLocal, Base
        from . import models  # noqa: F401
        from .seed import seed
        Base.metadata.create_all(engine)
        db = SessionLocal()
        try:
            seed(db)
        finally:
            db.close()
        log.info("AUTO_INIT_DB: tables created and reference data seeded")


# --- API first ---
app.include_router(auth_router)
app.include_router(game_router)


# --- clean error contract (T8): named statuses, never a bare 500, never swallow ---
@app.exception_handler(OperationalError)
async def handle_db_down(request: Request, exc: OperationalError):
    log.error("DB unavailable on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(status_code=503, content={"detail": "Service temporarily unavailable, try again"})


@app.exception_handler(Exception)
async def handle_unexpected(request: Request, exc: Exception):
    log.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Something went wrong"})


@app.get("/")
def hub():
    return FileResponse(REPO / "index.html")


@app.get("/sw.js")
def service_worker():
    # Served from root so its scope covers the whole origin.
    return FileResponse(REPO / "sw.js", media_type="application/javascript")


@app.get("/manifest.webmanifest")
def manifest():
    return FileResponse(REPO / "manifest.webmanifest", media_type="application/manifest+json")


# --- static LAST, specific prefixes ---
app.mount("/assets", StaticFiles(directory=str(REPO / "assets")), name="assets")
app.mount("/shared", StaticFiles(directory=str(REPO / "shared")), name="shared")
app.mount("/games", StaticFiles(directory=str(REPO / "games"), html=True), name="games")
if (REPO / "design").is_dir():
    app.mount("/design", StaticFiles(directory=str(REPO / "design")), name="design")
