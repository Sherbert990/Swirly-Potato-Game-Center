"""Gameplay/economy routes: score, leaderboards, store, item use."""
import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session as OrmSession

from ..db import get_db
from ..models import (User, Game, Score, Avatar, StoreItem, UserAvatar, UserItem,
                      Achievement, UserAchievement)
from .. import auth, config
from ._common import public_user, get_game_or_404


def _game_matches(achievement_game: str, slug: str) -> bool:
    """An achievement applies when it's global ('') or its game is the submitted
    slug or a sub-mode of it (e.g. 'lavender-leap' covers 'lavender-leap-time')."""
    if not achievement_game:
        return True
    return slug == achievement_game or slug.startswith(achievement_game + "-")


def evaluate_achievements(db: OrmSession, user: User, game_slug: str, score: int) -> list[dict]:
    """Auto-unlock any newly earned achievements. Server-side, so every game gets
    achievements for free just by submitting scores."""
    have = {ua.achievement_key for ua in db.query(UserAchievement).filter_by(user_id=user.id).all()}
    newly = []
    for a in db.query(Achievement).all():
        if a.key in have:
            continue
        if not _game_matches(a.game, game_slug):
            continue
        met = (a.metric == "score" and score >= a.threshold) or \
              (a.metric == "coins" and user.coins >= a.threshold)
        if met:
            db.add(UserAchievement(user_id=user.id, achievement_key=a.key))
            newly.append({"key": a.key, "name": a.name})
    if newly:
        db.commit()
    return newly

router = APIRouter(prefix="/api")

# Items that grant more than one charge per purchase (e.g. the Double Jump Pack
# gives 10 mid-air jumps). Used as a charge counter consumed via /api/use.
ITEM_GRANT = {"double_jump": 10}

# Per-process rate limiter for score posts (Phase 1). A multi-instance deploy
# would move this to the DB/Redis; fine for one server + friends.
_last_score_at: dict[int, datetime.datetime] = {}


class ScoreBody(BaseModel):
    game: str
    score: int
    coins: int = 0


class BuyBody(BaseModel):
    kind: str   # "avatar" | "item"
    key: str


class UseBody(BaseModel):
    item: str


def _personal_rows(db: OrmSession, user_id: int, game_id: int) -> list[dict]:
    rows = (db.query(Score).filter_by(user_id=user_id, game_id=game_id)
            .order_by(Score.score.desc()).limit(20).all())
    return [{"id": r.id, "score": r.score, "coins": r.coins_earned,
             "date": r.created_at.isoformat()} for r in rows]


@router.post("/score")
def submit_score(body: ScoreBody, user: User = Depends(auth.current_user), db: OrmSession = Depends(get_db)):
    game = get_game_or_404(db, body.game)

    # --- anti-cheat sanity caps (D3) ---
    if body.score < 0 or body.score > config.MAX_SCORE:
        raise HTTPException(status_code=422, detail="Score out of range")
    now = datetime.datetime.utcnow()
    last = _last_score_at.get(user.id)
    if last and (now - last).total_seconds() < config.SCORE_MIN_INTERVAL_SEC:
        raise HTTPException(status_code=429, detail="Slow down a moment")
    _last_score_at[user.id] = now
    coins = max(0, min(int(body.coins), config.MAX_COINS_PER_SUBMIT))

    row = Score(user_id=user.id, game_id=game.id, score=int(body.score), coins_earned=coins)
    db.add(row)
    user.coins += coins  # wallet credited server-side, never trusted from the client
    db.commit()
    db.refresh(user)
    db.refresh(row)
    newly = evaluate_achievements(db, user, game.slug, int(body.score))
    # Returns the refreshed wallet + this game's personal board for the game-over screen.
    return {"wallet": public_user(db, user),
            "scores": _personal_rows(db, user.id, game.id),
            "currentId": row.id,
            "unlocked": newly}


@router.get("/leaderboard/personal")
def leaderboard_personal(game: str = Query(...), user: User = Depends(auth.current_user),
                         db: OrmSession = Depends(get_db)):
    g = get_game_or_404(db, game)
    return _personal_rows(db, user.id, g.id)


@router.get("/leaderboard/global")
def leaderboard_global(game: str = Query(...), db: OrmSession = Depends(get_db)):
    g = get_game_or_404(db, game)
    # One row per player — their best run (tie-break by earliest). Window function.
    rn = func.row_number().over(
        partition_by=Score.user_id,
        order_by=(Score.score.desc(), Score.id.asc()),
    ).label("rn")
    best = (db.query(Score.user_id.label("uid"), Score.score.label("score"),
                     Score.coins_earned.label("coins"), rn)
            .filter(Score.game_id == g.id).subquery())
    rows = (db.query(User.username, best.c.score, best.c.coins)
            .join(User, User.id == best.c.uid)
            .filter(best.c.rn == 1, User.show_on_leaderboard.is_(True))
            .order_by(best.c.score.desc()).limit(20).all())
    return [{"username": un, "score": sc, "coins": co} for un, sc, co in rows]  # [] when empty (T7)


@router.post("/store/buy")
def store_buy(body: BuyBody, user: User = Depends(auth.current_user), db: OrmSession = Depends(get_db)):
    if body.kind == "avatar":
        av = db.get(Avatar, body.key)
        if not av:
            raise HTTPException(status_code=422, detail="Unknown avatar")
        if db.query(UserAvatar).filter_by(user_id=user.id, avatar_key=av.key).first() or av.price == 0:
            raise HTTPException(status_code=409, detail="Already owned")
        if user.coins < av.price:
            raise HTTPException(status_code=402, detail="Not enough coins")
        user.coins -= av.price
        db.add(UserAvatar(user_id=user.id, avatar_key=av.key))
    elif body.kind == "item":
        it = db.get(StoreItem, body.key)
        if not it:
            raise HTTPException(status_code=422, detail="Unknown item")
        if user.coins < it.price:
            raise HTTPException(status_code=402, detail="Not enough coins")
        user.coins -= it.price
        grant = ITEM_GRANT.get(it.key, 1)  # one purchase can grant a pack of charges
        row = db.query(UserItem).filter_by(user_id=user.id, item_key=it.key).first()
        if row:
            row.quantity += grant
        else:
            db.add(UserItem(user_id=user.id, item_key=it.key, quantity=grant))
    else:
        raise HTTPException(status_code=422, detail="kind must be 'avatar' or 'item'")
    db.commit()
    db.refresh(user)
    return public_user(db, user)


@router.post("/use")
def use_item(body: UseBody, user: User = Depends(auth.current_user), db: OrmSession = Depends(get_db)):
    row = db.query(UserItem).filter_by(user_id=user.id, item_key=body.item).first()
    if not row or row.quantity <= 0:
        raise HTTPException(status_code=409, detail="You don't have that item")
    row.quantity -= 1
    db.commit()
    db.refresh(user)
    return public_user(db, user)


@router.get("/achievements")
def list_achievements(game: str = Query(None), user: User = Depends(auth.current_user),
                      db: OrmSession = Depends(get_db)):
    have = {ua.achievement_key for ua in db.query(UserAchievement).filter_by(user_id=user.id).all()}
    out = []
    for a in db.query(Achievement).order_by(Achievement.game, Achievement.threshold).all():
        if game and a.game and a.game != game:
            continue
        out.append({"key": a.key, "name": a.name, "description": a.description,
                    "game": a.game, "unlocked": a.key in have})
    return out
