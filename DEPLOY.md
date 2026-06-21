# Deploy — Railway (Phase 3)

The whole app (hub + games + API) is one FastAPI service, served same-origin, so
session cookies "just work" on the Railway domain over HTTPS.

## One-time setup (Railway dashboard)

1. **New Project → Deploy from GitHub repo** → pick `Swirly-Potato-Game-Center`.
2. **Add a MySQL database** to the project (this is your **production** DB — separate
   from the staging DB you develop against).
3. In the **web service → Variables**, set:
   - `DATABASE_URL` = the prod MySQL string in SQLAlchemy form:
     `mysql+pymysql://USER:PASS@HOST:PORT/DBNAME?charset=utf8mb4`
     (convert Railway's `mysql://…` → `mysql+pymysql://…` and add `?charset=utf8mb4`)
   - `SECRET_KEY` = `openssl rand -hex 32`
   - `ENV` = `prod`   (turns on Secure cookies)
   - `AUTO_INIT_DB` = `1`   (first deploy only — creates tables + seeds; can remove after)
4. Deploy. Railway uses `Procfile` (`uvicorn backend.app:app --host 0.0.0.0 --port $PORT`)
   and root `requirements.txt`.

## Verify
- Open the Railway URL → the hub loads.
- `…/games/dont-look-down/dont_look_down.html` → sign up, climb, score saves,
  appears on the leaderboard.

## Notes
- After the first successful deploy you can unset `AUTO_INIT_DB` (tables exist).
  Once Alembic migrations land, drop it entirely and run migrations on release.
- Same-origin cookies are fine here. A future Capacitor app loads from a different
  origin and will need JWT + CORS (DESIGN.md §9.1).
- Keep prod creds ONLY in Railway Variables — never in the repo.
