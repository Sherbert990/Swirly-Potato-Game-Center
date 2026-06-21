"""Runtime configuration, driven by environment variables (DESIGN.md T11).

Local/dev reads `backend/.env` (gitignored). In production (Railway) the platform
injects these as real environment variables — there is no .env file in prod.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load backend/.env explicitly so it works regardless of the working directory.
load_dotenv(Path(__file__).resolve().parent / ".env")

ENV = os.getenv("ENV", "dev")  # "dev" | "prod"

# Never hardcode secrets. In prod this MUST be set in the environment.
SECRET_KEY = os.getenv("SECRET_KEY", "dev-insecure-change-me")

# MySQL by design (D2). utf8mb4 so emoji usernames behave.
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://root@127.0.0.1:3306/gamecenter?charset=utf8mb4",
)

# Cookie flags from config (T11): Secure only in prod so http:// dev still works.
COOKIE_SECURE = ENV == "prod"
COOKIE_SAMESITE = "lax"  # Capacitor build will switch to "none" + CORS (DESIGN.md §9.1)
SESSION_DAYS = 30

# Anti-cheat sanity caps (D3 / T5). Server is the source of truth for the wallet.
MAX_COINS_PER_SUBMIT = 1000   # clamp coins credited per score submission
MAX_SCORE = 1_000_000         # reject obviously impossible scores
SCORE_MIN_INTERVAL_SEC = 2    # basic rate limit between score posts per user
