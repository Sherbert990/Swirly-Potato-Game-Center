"""
Test harness (T9): per-test transaction rollback so tests never pollute each other.
Seeded reference data is committed once per session.

The test DB is TEST_DATABASE_URL (from .env or the shell). It defaults to a local
SQLite file — zero setup, no MySQL needed — but point it at a throwaway MySQL
(`gamecenter_test`) to test against the real engine. NEVER set it to a DB with data
you care about: the schema is dropped at session start and end.
"""
import os
from pathlib import Path

from dotenv import load_dotenv

# Honor .env (esp. TEST_DATABASE_URL) before choosing the test DB.
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

os.environ["DATABASE_URL"] = os.getenv(
    "TEST_DATABASE_URL",
    "sqlite:///./backend_test.sqlite",   # default: zero-setup local SQLite
)

import pytest
from sqlalchemy import event
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

# Safety guard: the schema is dropped at session start/end (see _schema below), so a
# stray TEST_DATABASE_URL pointing at a *remote* DB — e.g. a copy-pasted dev/prod URL
# in someone's .env — would silently wipe real data over a slow link. Refuse to run
# unless the target is SQLite or on this machine. Set ALLOW_REMOTE_TEST_DB=1 to
# override (as CI does implicitly by using a 127.0.0.1 service, which passes anyway).
_LOCAL_HOSTS = {None, "", "localhost", "127.0.0.1", "::1"}
if not os.getenv("ALLOW_REMOTE_TEST_DB"):
    _u = make_url(os.environ["DATABASE_URL"])
    if _u.get_backend_name() != "sqlite" and _u.host not in _LOCAL_HOSTS:
        raise RuntimeError(
            f"Refusing to run tests against remote DB host {_u.host!r}: the harness "
            f"DROPS ALL TABLES at start/end. Point TEST_DATABASE_URL at local SQLite "
            f"(sqlite:///./backend_test.sqlite) or a throwaway localhost DB. "
            f"Set ALLOW_REMOTE_TEST_DB=1 only if you truly mean it."
        )

from backend.db import Base, get_db, _make_engine
from backend import models  # noqa: F401
from backend.app import app
from backend.seed import seed
from backend import config as _cfg

_cfg.SCORE_MIN_INTERVAL_SEC = 0  # rate limit off in tests (covered separately, avoids flakiness)

engine = _make_engine(os.environ["DATABASE_URL"])   # SQLite- and MySQL-aware

# pysqlite mismanages transactions by default, which breaks the per-test savepoint
# rollback recipe (db_session) — data leaks between tests. Documented fix: disable
# the driver's implicit BEGIN and let SQLAlchemy emit BEGIN/SAVEPOINT itself.
# No-op on MySQL.
if engine.dialect.name == "sqlite":
    @event.listens_for(engine, "connect")
    def _sqlite_no_autobegin(dbapi_conn, _rec):
        dbapi_conn.isolation_level = None

    @event.listens_for(engine, "begin")
    def _sqlite_begin(conn):
        conn.exec_driver_sql("BEGIN")


@pytest.fixture(scope="session", autouse=True)
def _schema():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    S = sessionmaker(bind=engine, future=True)
    db = S()
    seed(db)  # committed reference data, visible to every test
    db.close()
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture
def db_session():
    """Bind a session to one connection in a transaction; roll back after the test.

    Uses SAVEPOINTs so the route code's own commit()s don't end the outer
    transaction (standard SQLAlchemy 'join an external transaction' recipe)."""
    conn = engine.connect()
    trans = conn.begin()
    S = sessionmaker(bind=conn, future=True)
    sess = S()
    sess.begin_nested()

    @event.listens_for(sess, "after_transaction_end")
    def _restart_savepoint(s, transaction):
        if transaction.nested and not transaction._parent.nested:
            s.begin_nested()

    try:
        yield sess
    finally:
        sess.close()
        trans.rollback()
        conn.close()


@pytest.fixture
def client(db_session):
    def _override():
        yield db_session
    app.dependency_overrides[get_db] = _override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
