"""
Auth: bcrypt directly (NOT passlib — eng review), DB-backed sessions (D1),
identity derived ONLY from the session cookie (IDOR-safe, T4).
"""
import datetime
import secrets

import bcrypt
from fastapi import Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session as OrmSession

from . import config
from .db import get_db
from .models import User, Session as DbSession

BCRYPT_MAX = 72  # bcrypt silently truncates beyond 72 bytes; reject loudly instead.


def hash_password(password: str) -> str:
    pw = password.encode("utf-8")
    if len(pw) > BCRYPT_MAX:
        raise HTTPException(status_code=422, detail="Password too long (max 72 bytes)")
    return bcrypt.hashpw(pw, bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8")[:BCRYPT_MAX], hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def _now() -> datetime.datetime:
    # Naive UTC (matches the DB's naive datetimes) without the deprecated utcnow().
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)


def create_session(db: OrmSession, user_id: int) -> str:
    # Opportunistic cleanup so the sessions table stays bounded — nothing else prunes it.
    db.query(DbSession).filter(DbSession.expires_at < _now()).delete(synchronize_session=False)
    token = secrets.token_urlsafe(32)
    db.add(DbSession(token=token, user_id=user_id,
                     expires_at=_now() + datetime.timedelta(days=config.SESSION_DAYS)))
    db.commit()
    return token


def destroy_session(db: OrmSession, token: str) -> None:
    s = db.get(DbSession, token)
    if s:
        db.delete(s)
        db.commit()


def set_session_cookie(resp: Response, token: str) -> None:
    resp.set_cookie("sid", token, max_age=config.SESSION_DAYS * 86400, httponly=True,
                    secure=config.COOKIE_SECURE, samesite=config.COOKIE_SAMESITE, path="/")


def clear_session_cookie(resp: Response) -> None:
    resp.set_cookie("sid", "", max_age=0, httponly=True,
                    secure=config.COOKIE_SECURE, samesite=config.COOKIE_SAMESITE, path="/")


def current_user(request: Request, db: OrmSession = Depends(get_db)) -> User:
    """The ONLY way a request gets a user identity. No client-supplied user id is ever trusted."""
    token = request.cookies.get("sid")
    if not token:
        raise HTTPException(status_code=401, detail="Not logged in")
    s = db.get(DbSession, token)
    if not s or s.expires_at < _now():
        raise HTTPException(status_code=401, detail="Session expired")
    user = db.get(User, s.user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Not logged in")
    return user
