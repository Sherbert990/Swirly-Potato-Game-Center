# The Stickmen Hub — backend (Phase 1)

FastAPI + MySQL (sync SQLAlchemy + PyMySQL). Serves the hub + games same-origin and
the `/api` contract the Don't Look Down frontend expects. See `../DESIGN.md`.

## Run locally

```bash
# 1. MySQL (pick one)
brew services start mysql          # Homebrew, or:
docker compose up -d               # uses docker-compose.yml

# 2. Create databases
mysql -uroot -e "CREATE DATABASE IF NOT EXISTS gamecenter CHARACTER SET utf8mb4; \
                 CREATE DATABASE IF NOT EXISTS gamecenter_test CHARACTER SET utf8mb4;"

# 3. Python env
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt

# 4. Create tables + seed reference data (games/avatars/store items)
python -m backend.init_db          # run from the repo root

# 5. Serve  →  http://127.0.0.1:8000
uvicorn backend.app:app --reload --port 8000
```

Hub at `/`, games under `/games/...`, API under `/api/...`.

## Tests (real MySQL, per-test rollback)

```bash
pytest backend/tests -q            # from repo root, needs gamecenter_test
```

## Endpoints (normalized contract — DESIGN.md §4)

`POST /api/register · /api/login · /api/logout` · `GET /api/me` · `POST /api/profile`
`POST /api/score {game,score,coins}` · `GET /api/leaderboard/{personal|global}?game=`
`POST /api/store/buy {kind,key}` · `POST /api/use {item}`

## Notes / next
- Auth: bcrypt directly, DB-backed sessions, identity from the session cookie only (IDOR-safe).
- Anti-cheat: coins clamped + impossible scores rejected + score rate-limit (config.py).
- **Alembic** migrations are the next step (currently `init_db.py` uses `create_all`).
- Config via env (`.env.example`); cookies `Secure` only in prod.
