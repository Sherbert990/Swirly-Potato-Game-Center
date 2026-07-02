#!/usr/bin/env python
"""
Guardrail for the single source of truth (shared/catalog.json).

Because the backend, the SDK and the hub all DERIVE from the manifest, the classic
"catalog key not in seed" bug can't happen — but a malformed manifest still can
(duplicate keys, a value too long for its DB column, a missing field). This checks
that, with no database required. Wire it into CI / a pre-commit hook.

Run:  python scripts/check_catalog.py     (exits non-zero on any problem)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.seed import load_catalog, derive  # noqa: E402

# Column limits from backend/models.py — a value over these would break inserts.
LIMITS = {"game_slug": 40, "game_name": 80, "avatar_key": 40, "avatar_name": 60,
          "item_key": 40, "item_name": 60, "item_type": 20}


def check(catalog):
    errors = []
    games = catalog.get("games", [])
    if not games:
        errors.append("catalog has no games")

    slugs, all_keys = set(), {}   # all_keys: key -> where (must be globally unique)

    def claim(key, where):
        if key in all_keys:
            errors.append(f"duplicate key '{key}' ({all_keys[key]} and {where})")
        else:
            all_keys[key] = where

    for g in games:
        slug = g.get("slug")
        for field in ("slug", "name", "cover", "play"):
            if not g.get(field):
                errors.append(f"game '{slug}' missing '{field}'")
        if slug in slugs:
            errors.append(f"duplicate game slug '{slug}'")
        slugs.add(slug)
        if len(slug or "") > LIMITS["game_slug"]:
            errors.append(f"slug too long: '{slug}'")
        if not g.get("leaderboards"):
            errors.append(f"game '{slug}' has no leaderboards")
        for b in g.get("leaderboards", []):
            if not b.get("board") or not b.get("label"):
                errors.append(f"game '{slug}' leaderboard missing board/label")
            if not isinstance(b.get("unit", ""), str):
                errors.append(f"game '{slug}' leaderboard unit must be a string")
        for a in g.get("avatars", []):
            claim(a.get("key"), f"avatar in {slug}")
            if not isinstance(a.get("price", 0), int) or a.get("price", 0) < 0:
                errors.append(f"avatar '{a.get('key')}' price must be a non-negative int")
        for grp in g.get("skinGroups", []):
            for field in ("prefKey", "event", "title", "choices"):
                if not grp.get(field):
                    errors.append(f"skinGroup in '{slug}' missing '{field}'")
            for ch in grp.get("choices", []):
                if not ch.get("pref") or not ch.get("name"):
                    errors.append(f"skin choice in '{slug}' missing pref/name")
                if ch.get("key"):        # a purchasable (non-free) choice
                    claim(ch["key"], f"skin in {slug}")
                    if not isinstance(ch.get("price"), int):
                        errors.append(f"skin '{ch['key']}' needs an int price")
        for it in g.get("items", []):
            claim(it.get("key"), f"item in {slug}")
        for up in g.get("upgrades", []):
            for lv in up.get("levels", []):
                claim(lv.get("key"), f"upgrade in {slug}")

    # Derived rows must fit their DB columns.
    game_rows, avatars, items, item_game = derive(catalog)
    for s, n in game_rows:
        if len(s) > LIMITS["game_slug"]:
            errors.append(f"derived game slug too long: '{s}'")
        if len(n) > LIMITS["game_name"]:
            errors.append(f"derived game name too long ({len(n)}): '{n}'")
    for key, name, _src, price, _prem in avatars:
        if len(key) > LIMITS["avatar_key"]:
            errors.append(f"avatar key too long: '{key}'")
        if len(name) > LIMITS["avatar_name"]:
            errors.append(f"avatar name too long: '{name}'")
    for key, name, typ, price in items:
        if len(key) > LIMITS["item_key"]:
            errors.append(f"item key too long: '{key}'")
        if len(name) > LIMITS["item_name"]:
            errors.append(f"item name too long: '{name}'")
        if len(typ) > LIMITS["item_type"]:
            errors.append(f"item type too long: '{typ}'")
        if not isinstance(price, int) or price < 0:
            errors.append(f"item '{key}' price must be a non-negative int")

    return errors, (game_rows, avatars, items, item_game)


def main():
    catalog = load_catalog()
    errors, (game_rows, avatars, items, _ig) = check(catalog)
    if errors:
        print("catalog.json has problems:")
        for e in errors:
            print("  -", e)
        return 1
    print(f"catalog.json OK  ·  {len(catalog['games'])} games  ·  "
          f"{len(game_rows)} game rows  ·  {len(avatars)} avatars  ·  {len(items)} store items")
    return 0


if __name__ == "__main__":
    sys.exit(main())
