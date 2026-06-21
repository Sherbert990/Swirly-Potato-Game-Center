"""Shared serialization + lookups for routes."""
import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session as OrmSession

from ..models import Avatar, UserAvatar, UserItem, Game, User, UserDaily


def _streak(db: OrmSession, user_id: int) -> int:
    row = db.get(UserDaily, user_id)
    return row.streak if row else 0


def public_user(db: OrmSession, user: User) -> dict:
    """The normalized /api/me shape. Free avatars (price 0) are implicitly owned."""
    owned = {a.key for a in db.query(Avatar).filter(Avatar.price == 0).all()}
    owned |= {ua.avatar_key for ua in db.query(UserAvatar).filter_by(user_id=user.id).all()}
    items = {ui.item_key: ui.quantity for ui in db.query(UserItem).filter_by(user_id=user.id).all()}
    return {
        "username": user.username,
        "avatarKey": user.current_avatar_key,
        "coins": user.coins,
        "showName": user.show_on_leaderboard,
        "ownedAvatars": sorted(owned),
        "items": items,
        "streak": _streak(db, user.id),
    }


def daily_bonus(streak: int) -> int:
    return 10 + min(max(streak - 1, 0), 6) * 5  # 10 on day 2, capped at 40


def touch_daily(db: OrmSession, user: User) -> int:
    """Record today's visit; award a bonus on the first visit of a NEW day.
    Day 1 establishes the streak but gives no bonus (keeps fresh users at 0 coins).
    Returns the coins awarded this call (0 if none)."""
    today = datetime.date.today()
    row = db.get(UserDaily, user.id)
    awarded = 0
    if row is None:
        db.add(UserDaily(user_id=user.id, last_date=today, streak=1))
    elif row.last_date < today:
        row.streak = row.streak + 1 if row.last_date == today - datetime.timedelta(days=1) else 1
        row.last_date = today
        awarded = daily_bonus(row.streak)
        user.coins += awarded
    db.commit()
    return awarded


def me_payload(db: OrmSession, user: User) -> dict:
    """public_user + daily bonus handling. For /api/me, /api/login, /api/register."""
    bonus = touch_daily(db, user)
    data = public_user(db, user)
    data["dailyBonus"] = bonus
    return data


def get_game_or_404(db: OrmSession, slug: str) -> Game:
    game = db.query(Game).filter_by(slug=slug).first()
    if not game:
        raise HTTPException(status_code=404, detail="Unknown game")
    return game
