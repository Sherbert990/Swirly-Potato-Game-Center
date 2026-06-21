"""Shared serialization + lookups for routes."""
from fastapi import HTTPException
from sqlalchemy.orm import Session as OrmSession

from ..models import Avatar, UserAvatar, UserItem, Game, User


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
    }


def get_game_or_404(db: OrmSession, slug: str) -> Game:
    game = db.query(Game).filter_by(slug=slug).first()
    if not game:
        raise HTTPException(status_code=404, detail="Unknown game")
    return game
