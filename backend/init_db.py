"""
Dev bootstrap: create tables + seed reference data.

Phase 1 uses metadata.create_all for speed of iteration. Formalizing with Alembic
migrations (T2/T3) is the immediate follow-up before any schema change ships.

Usage:  python -m backend.init_db
"""
from .db import engine, SessionLocal, Base
from . import models  # noqa: F401  (registers tables on Base.metadata)
from .seed import seed


def main() -> None:
    Base.metadata.create_all(engine)
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()
    print("DB initialized and seeded.")


if __name__ == "__main__":
    main()
