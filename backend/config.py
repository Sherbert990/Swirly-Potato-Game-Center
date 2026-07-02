"""Runtime configuration, driven by environment variables (DESIGN.md T11).

Local/dev reads `backend/.env` (gitignored). In production (Railway) the platform
injects these as real environment variables — there is no .env file in prod.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load the repo-root .env explicitly so it works regardless of the working
# directory. (In prod the platform injects real env vars and there is no file.)
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

ENV = os.getenv("ENV", "dev")  # "dev" | "prod"

# Never hardcode secrets. In prod this MUST be set in the environment.
SECRET_KEY = os.getenv("SECRET_KEY", "dev-insecure-change-me")

# MySQL by design (D2). utf8mb4 so emoji usernames behave.
def _normalize_db_url(url: str) -> str:
    """Be forgiving about the DB URL form. Railway/hosts hand out `mysql://…`,
    which SQLAlchemy maps to the (uninstalled) MySQLdb driver. Force PyMySQL and
    ensure utf8mb4 so a pasted Railway URL just works."""
    if url.startswith("mysql://"):
        url = "mysql+pymysql://" + url[len("mysql://"):]
    if url.startswith("mysql+pymysql://") and "charset=" not in url:
        url += ("&" if "?" in url else "?") + "charset=utf8mb4"
    return url


DATABASE_URL = _normalize_db_url(os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://root@127.0.0.1:3306/gamecenter?charset=utf8mb4",
))

# Cookie flags from config (T11): Secure only in prod so http:// dev still works.
COOKIE_SECURE = ENV == "prod"
COOKIE_SAMESITE = "lax"  # Capacitor build will switch to "none" + CORS (DESIGN.md §9.1)
SESSION_DAYS = 30

# Anti-cheat sanity caps (D3 / T5). Server is the source of truth for the wallet.
MAX_COINS_PER_SUBMIT = 1000   # clamp coins credited per score submission
MAX_SCORE = 1_000_000         # fallback cap; per-board caps come from the catalog (SCORE_CAPS)
SCORE_MIN_INTERVAL_SEC = 2    # basic rate limit between score posts per user
SCORES_KEEP_PER_GAME = 50     # bound the scores table: keep each user's best N per game (>= personal board size 20)

# Login hardening (Phase 7): lock out brute-force after too many fails in a window.
LOGIN_MAX_FAILS = 5
LOGIN_WINDOW_SEC = 300
