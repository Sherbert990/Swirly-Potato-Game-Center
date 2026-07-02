"""
Reference-data seed (T3): games, avatars, store_items — all DERIVED from the single
source of truth, ../shared/catalog.json, so the backend, the SDK (shared/gamecenter.js)
and the hub can never drift. Adding a game = one entry in catalog.json; no edits here.

Achievements are not part of the shared catalog (backend-only), so they stay below.
Idempotent — safe to run repeatedly.
"""
import json
from pathlib import Path

from sqlalchemy.orm import Session as OrmSession

from .models import Game, Avatar, StoreItem, Achievement

CATALOG_PATH = Path(__file__).resolve().parent.parent / "shared" / "catalog.json"
_ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"]


def load_catalog() -> dict:
    with open(CATALOG_PATH, encoding="utf-8") as f:
        return json.load(f)


def derive(catalog: dict):
    """Flatten the manifest into the rows the DB needs.
    Returns (games, avatars, store_items, item_game, score_caps):
      games       -> [(slug, name)]              (main slugs + every leaderboard board slug)
      avatars     -> [(key, name, source_game, price, is_premium)]
      store_items -> [(key, name, type, price)]  (items + keyed skin choices + upgrade levels)
      item_game   -> {store_item_key: game_slug} (lets each game show only its own items)
      score_caps  -> {board_slug: max_score}     (per-board sanity cap for /api/score)
    """
    games, avatars, store_items, item_game, score_caps = [], [], [], {}, {}
    seen_games = set()

    def add_game(slug, name):
        if slug not in seen_games:
            seen_games.add(slug)
            games.append((slug, name))

    def add_item(key, name, typ, price, slug):
        store_items.append((key, name, typ, price))
        item_game[key] = slug

    for g in catalog.get("games", []):
        slug, name = g["slug"], g["name"]
        add_game(slug, name)
        for b in g.get("leaderboards", []):
            add_game(b["board"], b.get("name", b.get("label", name)))
            if b.get("maxScore") is not None:
                score_caps[b["board"]] = int(b["maxScore"])
        for a in g.get("avatars", []):
            avatars.append((a["key"], a["name"], slug, a.get("price", 0),
                            bool(a.get("premium", a.get("price", 0) > 0))))
        for it in g.get("items", []):
            add_item(it["key"], it["name"], it.get("type", "item"), it["price"], slug)
        for grp in g.get("skinGroups", []):
            noun = (grp.get("title", "").split() or [""])[0]  # "Light colours" -> "Light"
            for ch in grp.get("choices", []):
                if ch.get("key"):  # free defaults have no key -> not a store item
                    label = (ch["name"] + " " + noun).strip()
                    add_item(ch["key"], label, grp.get("itemType", "cosmetic"), ch["price"], slug)
        for up in g.get("upgrades", []):
            for i, lv in enumerate(up.get("levels", []), start=1):
                add_item(lv["key"], f"{up['name']} {_ROMAN[i]}",
                         up.get("itemType", "upgrade"), lv["price"], slug)
    return games, avatars, store_items, item_game, score_caps


# Derived once at import so `from .seed import GAMES/AVATARS/STORE_ITEMS/ITEM_GAME` still works.
CATALOG = load_catalog()
GAMES, AVATARS, STORE_ITEMS, ITEM_GAME, SCORE_CAPS = derive(CATALOG)

# (key, name, description, game ('' = any), metric, threshold) — backend-only, not in the catalog.
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
    """Upsert reference data: insert new rows AND update mutable fields on existing
    ones, so editing a price/name/etc in catalog.json actually propagates to an
    already-seeded DB (staging/prod), not just a fresh one. Never deletes."""
    for slug, name in GAMES:
        g = db.query(Game).filter_by(slug=slug).first()
        if g:
            g.name = name
        else:
            db.add(Game(slug=slug, name=name))
    for key, name, src, price, premium in AVATARS:
        a = db.get(Avatar, key)
        if a:
            a.name, a.source_game, a.price, a.is_premium = name, src, price, premium
        else:
            db.add(Avatar(key=key, name=name, source_game=src, price=price, is_premium=premium))
    for key, name, typ, price in STORE_ITEMS:
        it = db.get(StoreItem, key)
        if it:
            it.name, it.type, it.price = name, typ, price
        else:
            db.add(StoreItem(key=key, name=name, type=typ, price=price))
    for key, name, desc, game, metric, threshold in ACHIEVEMENTS:
        ach = db.get(Achievement, key)
        if ach:
            ach.name, ach.description, ach.game, ach.metric, ach.threshold = name, desc, game, metric, threshold
        else:
            db.add(Achievement(key=key, name=name, description=desc, game=game,
                               metric=metric, threshold=threshold))
    db.commit()
