"""Account routes: register, login, logout, me, profile."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session as OrmSession

from ..db import get_db
from ..models import User, Avatar, UserAvatar
from .. import auth
from ._common import public_user

router = APIRouter(prefix="/api")


class RegisterBody(BaseModel):
    username: str
    password: str
    avatar: Optional[str] = None  # avatarKey


class LoginBody(BaseModel):
    username: str
    password: str


class ProfileBody(BaseModel):
    username: Optional[str] = None
    avatar: Optional[str] = None  # avatarKey
    showName: Optional[bool] = None


def _validate_username(raw: str) -> str:
    name = (raw or "").strip()
    if not (1 <= len(name) <= 32):
        raise HTTPException(status_code=422, detail="Username must be 1-32 characters")
    return name


def _validate_password(pw: str) -> None:
    # Requirement: passwords above 4 characters.
    if not pw or len(pw) <= 4:
        raise HTTPException(status_code=422, detail="Password must be more than 4 characters")


@router.post("/register")
def register(body: RegisterBody, response: Response, db: OrmSession = Depends(get_db)):
    name = _validate_username(body.username)
    _validate_password(body.password)
    key = name.lower()
    if db.query(User).filter_by(username_key=key).first():
        raise HTTPException(status_code=409, detail="Username taken")

    avatar_key = body.avatar
    if avatar_key:
        av = db.get(Avatar, avatar_key)
        if not av or av.is_premium or av.price > 0:
            raise HTTPException(status_code=422, detail="Pick a free starter avatar")
    else:
        first_free = db.query(Avatar).filter(Avatar.price == 0).order_by(Avatar.key).first()
        avatar_key = first_free.key if first_free else None

    user = User(username=name, username_key=key,
                password_hash=auth.hash_password(body.password),
                current_avatar_key=avatar_key)
    db.add(user)
    db.commit()
    db.refresh(user)

    token = auth.create_session(db, user.id)
    auth.set_session_cookie(response, token)
    return public_user(db, user)


@router.post("/login")
def login(body: LoginBody, response: Response, db: OrmSession = Depends(get_db)):
    key = (body.username or "").strip().lower()
    user = db.query(User).filter_by(username_key=key).first()
    # Generic message either way — do not reveal whether the username exists.
    if not user or not auth.verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Wrong username or password")
    token = auth.create_session(db, user.id)
    auth.set_session_cookie(response, token)
    return public_user(db, user)


@router.post("/logout")
def logout(request: Request, response: Response, db: OrmSession = Depends(get_db)):
    token = request.cookies.get("sid")
    if token:
        auth.destroy_session(db, token)
    auth.clear_session_cookie(response)
    return {"ok": True}


@router.get("/me")
def me(user: User = Depends(auth.current_user), db: OrmSession = Depends(get_db)):
    return public_user(db, user)


@router.post("/profile")
def profile(body: ProfileBody, user: User = Depends(auth.current_user), db: OrmSession = Depends(get_db)):
    if body.username is not None:
        name = _validate_username(body.username)
        key = name.lower()
        clash = db.query(User).filter_by(username_key=key).first()
        if clash and clash.id != user.id:
            raise HTTPException(status_code=409, detail="Username taken")
        user.username, user.username_key = name, key
    if body.avatar is not None:
        owned = body.avatar
        av = db.get(Avatar, owned)
        if not av:
            raise HTTPException(status_code=422, detail="Unknown avatar")
        free = av.price == 0
        has = db.query(UserAvatar).filter_by(user_id=user.id, avatar_key=owned).first()
        if not free and not has:
            raise HTTPException(status_code=403, detail="You don't own that avatar")
        user.current_avatar_key = owned
    if body.showName is not None:
        user.show_on_leaderboard = bool(body.showName)
    db.commit()
    return public_user(db, user)
