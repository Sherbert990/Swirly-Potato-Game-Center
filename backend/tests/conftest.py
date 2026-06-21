"""
Test harness (T9): real MySQL (not SQLite), per-test transaction rollback so tests
never pollute each other. Seeded reference data is committed once per session.

Requires a MySQL database `gamecenter_test` reachable at TEST_DATABASE_URL (default
below). Run:  python -m backend.init_db is NOT needed — conftest creates the schema.
"""
import os

os.environ["DATABASE_URL"] = os.getenv(
    "TEST_DATABASE_URL",
    "mysql+pymysql://root@127.0.0.1:3306/gamecenter_test?charset=utf8mb4",
)

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from backend.db import Base, get_db
from backend import models  # noqa: F401
from backend.app import app
from backend.seed import seed
from backend import config as _cfg

_cfg.SCORE_MIN_INTERVAL_SEC = 0  # rate limit off in tests (covered separately, avoids flakiness)

engine = create_engine(os.environ["DATABASE_URL"], future=True)


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
