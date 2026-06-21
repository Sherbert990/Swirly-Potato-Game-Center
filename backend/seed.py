"""
Reference-data seed (T3): games, avatars, store_items. Phase 1 cannot pass without
a `games` row (FK on scores). Idempotent — safe to run repeatedly.
"""
from sqlalchemy.orm import Session as OrmSession

from .models import Game, Avatar, StoreItem

GAMES = [
    ("lavender-leap", "Lavender Leap of Doom"),
    ("dont-look-down", "Don't Look Down"),
]

# Combined avatar catalog (DESIGN.md §7). Free = price 0.
AVATARS = [
    # Lavender Leap set
    ("ll-cyber-ninja", "Cyber Ninja", "lavender-leap", 0, False),
    ("ll-mecha-bot", "Mecha Bot", "lavender-leap", 0, False),
    ("ll-galaxy-slime", "Galaxy Slime", "lavender-leap", 0, False),
    ("ll-flame-fox", "Flame Fox", "lavender-leap", 0, False),
    ("ll-star-cadet", "Star Cadet", "lavender-leap", 20, False),
    ("ll-phantom-knight", "Phantom Knight", "lavender-leap", 25, False),
    ("ll-lava-golem", "Lava Golem", "lavender-leap", 30, False),
    ("ll-frost-sprite", "Frost Sprite", "lavender-leap", 35, False),
    ("ll-neon-bee", "Neon Bee", "lavender-leap", 40, False),
    # Don't Look Down set
    ("dld-aqua", "Aqua", "dont-look-down", 0, False),
    ("dld-ember", "Ember", "dont-look-down", 0, False),
    ("dld-leaf", "Leaf", "dont-look-down", 0, False),
    ("dld-wave", "Wave", "dont-look-down", 0, False),
    ("dld-rose", "Rose", "dont-look-down", 0, False),
    ("dld-bolt", "Bolt", "dont-look-down", 0, False),
    ("dld-grape", "Grape", "dont-look-down", 0, False),
    ("dld-bot", "Bot", "dont-look-down", 0, False),
    ("dld-mint", "Mint", "dont-look-down", 0, False),
    ("dld-volt", "Volt", "dont-look-down", 0, False),
    ("dld-nova", "Nova", "dont-look-down", 60, True),
    ("dld-phantom", "Phantom", "dont-look-down", 80, True),
    ("dld-aurora", "Aurora", "dont-look-down", 100, True),
    ("dld-cosmo", "Cosmo", "dont-look-down", 120, True),
]

STORE_ITEMS = [
    ("revive", "Revive", "revive", 25),
    ("headstart", "Head Start", "headstart", 15),
    ("doubler", "Star Doubler", "doubler", 20),
    ("extra_life", "Extra Life", "extra_life", 15),
    ("boost", "Boost", "boost", 15),
]


def seed(db: OrmSession) -> None:
    for slug, name in GAMES:
        if not db.query(Game).filter_by(slug=slug).first():
            db.add(Game(slug=slug, name=name))
    for key, name, src, price, premium in AVATARS:
        if not db.get(Avatar, key):
            db.add(Avatar(key=key, name=name, source_game=src, price=price, is_premium=premium))
    for key, name, typ, price in STORE_ITEMS:
        if not db.get(StoreItem, key):
            db.add(StoreItem(key=key, name=name, type=typ, price=price))
    db.commit()
