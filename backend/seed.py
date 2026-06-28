"""
Reference-data seed (T3): games, avatars, store_items. Phase 1 cannot pass without
a `games` row (FK on scores). Idempotent — safe to run repeatedly.
"""
from sqlalchemy.orm import Session as OrmSession

from .models import Game, Avatar, StoreItem, Achievement

GAMES = [
    ("lavender-leap", "Lavender Leap of Doom"),
    ("dont-look-down", "Don't Look Down"),
    # Per-mode leaderboards for Lavender Leap (separate boards, separate scores):
    #   -time : levels cleared in a Time Trial
    #   -hard : highest level reached in Hard Mode
    ("lavender-leap-time", "Lavender Leap · Time Trial"),
    ("lavender-leap-hard", "Lavender Leap · Hard Mode"),
    ("echo", "Echo"),  # see-with-sound cave game; score = caves cleared
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
    # Game-scoped power-ups (scope is enforced client-side; see ITEM_GAME).
    ("double_jump", "Double Jump Pack", "double_jump", 60),   # Lavender: 10 mid-air jumps (any mode)
    ("rocket_booster", "Rocket Booster", "rocket_booster", 20),  # Don't Look Down: +100ft head start
    # Echo (see-with-sound) — light colors (avatars) + a pulse power-up.
    ("echo-purple", "Purple Light", "echo_color", 20),
    ("echo-blue", "Blue Light", "echo_color", 20),
    ("echo-green", "Green Light", "echo_color", 20),
    ("echo-yellow", "Yellow Light", "echo_color", 25),
    ("echo-orange", "Orange Light", "echo_color", 25),
    ("echo-red", "Red Light", "echo_color", 30),
    ("echo-pink", "Pink Light", "echo_color", 30),
    ("echo_big_waves", "Bigger Waves", "echo_powerup", 40),  # pulses travel farther
]

# Which game each store item belongs to ('' = available everywhere). The buy/use
# endpoints validate only by key; this map lets each game show just its own items.
ITEM_GAME = {
    "double_jump": "lavender-leap",
    "rocket_booster": "dont-look-down",
    "echo-purple": "echo", "echo-blue": "echo", "echo-green": "echo",
    "echo-yellow": "echo", "echo-orange": "echo", "echo-red": "echo",
    "echo-pink": "echo", "echo_big_waves": "echo",
}

# (key, name, description, game ('' = any), metric, threshold)
ACHIEVEMENTS = [
    ("getting-started", "Getting Started", "Play your first game", "", "score", 1),
    ("coin-collector", "Coin Collector", "Hold 100 coins", "", "coins", 100),
    ("coin-baron", "Coin Baron", "Hold 500 coins", "", "coins", 500),
    ("first-climb", "First Climb", "Score in Don't Look Down", "dont-look-down", "score", 1),
    ("high-climber", "High Climber", "Reach 500 in Don't Look Down", "dont-look-down", "score", 500),
    ("sky-high", "Sky High", "Reach 2000 in Don't Look Down", "dont-look-down", "score", 2000),
    ("first-leap", "First Leap", "Score in Lavender Leap", "lavender-leap", "score", 1),
    ("big-leaper", "Big Leaper", "Reach 500 in Lavender Leap", "lavender-leap", "score", 500),
    ("leap-master", "Leap Master", "Reach 1500 in Lavender Leap", "lavender-leap", "score", 1500),
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
    for key, name, desc, game, metric, threshold in ACHIEVEMENTS:
        if not db.get(Achievement, key):
            db.add(Achievement(key=key, name=name, description=desc, game=game,
                               metric=metric, threshold=threshold))
    db.commit()
