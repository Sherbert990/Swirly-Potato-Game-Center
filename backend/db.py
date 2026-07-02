"""SQLAlchemy engine + session (sync, per DESIGN.md decision)."""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import StaticPool

from . import config


def _make_engine(url):
    """MySQL in prod/dev; SQLite is also supported for zero-setup local dev + tests
    (set DATABASE_URL=sqlite:///./dev.sqlite). SQLite needs check_same_thread off
    because FastAPI serves sync routes on a threadpool, and an in-memory URL needs
    one shared connection (StaticPool) so every request sees the same schema/data."""
    if url.startswith("sqlite"):
        kw = {"connect_args": {"check_same_thread": False}, "future": True}
        if url == "sqlite://" or ":memory:" in url:
            kw["poolclass"] = StaticPool
        return create_engine(url, **kw)
    # pool_pre_ping avoids stale-connection errors against MySQL.
    return create_engine(url, pool_pre_ping=True, future=True)


engine = _make_engine(config.DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency: one session per request, always closed."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
