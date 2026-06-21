"""
Data model (DESIGN.md §5). Sync SQLAlchemy 2.0, explicit String lengths and
utf8mb4 so MySQL behaves (eng review). Avatars/items use stable string keys.

  users 1───* scores *───1 games
  users 1───* sessions
  users *───* avatars      (user_avatars)
  users *───* store_items  (user_items, with quantity)
"""
import datetime
from typing import Optional

from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, Index, func
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base

UTF8 = {"mysql_charset": "utf8mb4"}


class User(Base):
    __tablename__ = "users"
    __table_args__ = (UTF8,)
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(32), nullable=False)            # display
    username_key: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)  # case-folded unique
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    coins: Mapped[int] = mapped_column(Integer, nullable=False, default=0)       # the shared wallet
    current_avatar_key: Mapped[Optional[str]] = mapped_column(String(40))
    show_on_leaderboard: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now())


class Session(Base):
    """DB-backed sessions (D1) — survive restarts, support server-side logout."""
    __tablename__ = "sessions"
    __table_args__ = (UTF8,)
    token: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    expires_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)


class Game(Base):
    __tablename__ = "games"
    __table_args__ = (UTF8,)
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(80), nullable=False)


class Avatar(Base):
    __tablename__ = "avatars"
    __table_args__ = (UTF8,)
    key: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[str] = mapped_column(String(60), nullable=False)
    source_game: Mapped[Optional[str]] = mapped_column(String(40))
    price: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_premium: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class StoreItem(Base):
    __tablename__ = "store_items"
    __table_args__ = (UTF8,)
    key: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[str] = mapped_column(String(60), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # boost | extra_life | doubler | revive | headstart
    price: Mapped[int] = mapped_column(Integer, nullable=False)


class Score(Base):
    __tablename__ = "scores"
    # Index powers the global leaderboard (T7).
    __table_args__ = (Index("ix_scores_game_score", "game_id", "score"), UTF8)
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id"), nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    coins_earned: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, server_default=func.now())


class UserAvatar(Base):
    __tablename__ = "user_avatars"
    __table_args__ = (UTF8,)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    avatar_key: Mapped[str] = mapped_column(ForeignKey("avatars.key"), primary_key=True)


class UserItem(Base):
    __tablename__ = "user_items"
    __table_args__ = (UTF8,)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    item_key: Mapped[str] = mapped_column(ForeignKey("store_items.key"), primary_key=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
