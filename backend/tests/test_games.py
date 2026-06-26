"""Key game-facing flows (the server contract each game relies on):
per-mode leaderboards, achievements that span a game's modes, the store power-up
packs, and the global-leaderboard name opt-out.

These cover the backend logic + anti-cheat the games depend on. The in-browser
gameplay (jumping, collisions) would need a browser test runner — not covered here.
"""


def reg(client, username, password="hunter2", avatar=None):
    return client.post("/api/register", json={"username": username, "password": password, "avatar": avatar})


def earn(client, game, score, coins):
    """Submit a score (also how the wallet is credited, server-side)."""
    return client.post("/api/score", json={"game": game, "score": score, "coins": coins})


# ---------- Lavender Leap: per-mode leaderboards ----------

def test_lavender_time_trial_board(client):
    reg(client, "Tia")
    r = earn(client, "lavender-leap-time", 7, 3)  # cleared 7 levels in a time trial
    assert r.status_code == 200, r.text
    board = client.get("/api/leaderboard/global", params={"game": "lavender-leap-time"}).json()
    assert any(row["username"] == "Tia" and row["score"] == 7 for row in board)


def test_lavender_hard_mode_board(client):
    reg(client, "Hugo")
    earn(client, "lavender-leap-hard", 12, 0)  # reached level 12; 0 coins is fine
    mine = client.get("/api/leaderboard/personal", params={"game": "lavender-leap-hard"}).json()
    assert mine and mine[0]["score"] == 12


def test_time_and_hard_boards_are_separate(client):
    reg(client, "Sam")
    earn(client, "lavender-leap-time", 5, 0)
    earn(client, "lavender-leap-hard", 30, 0)
    time_board = client.get("/api/leaderboard/personal", params={"game": "lavender-leap-time"}).json()
    hard_board = client.get("/api/leaderboard/personal", params={"game": "lavender-leap-hard"}).json()
    assert [r["score"] for r in time_board] == [5]
    assert [r["score"] for r in hard_board] == [30]


def test_lavender_achievement_spans_modes(client):
    # A score posted on a sub-mode slug still unlocks the base lavender-leap achievement.
    reg(client, "Ada")
    earn(client, "lavender-leap-time", 3, 1)
    achs = client.get("/api/achievements", params={"game": "lavender-leap"}).json()
    first_leap = next(a for a in achs if a["key"] == "first-leap")
    assert first_leap["unlocked"] is True


# ---------- Don't Look Down ----------

def test_dld_score_and_board(client):
    reg(client, "Dex")
    earn(client, "dont-look-down", 800, 5)
    board = client.get("/api/leaderboard/global", params={"game": "dont-look-down"}).json()
    assert any(row["username"] == "Dex" and row["score"] == 800 for row in board)


def test_unknown_game_is_404(client):
    reg(client, "Quin")
    assert earn(client, "not-a-game", 10, 1).status_code == 404


# ---------- Store power-ups ----------

def test_double_jump_pack_grants_ten_charges(client):
    reg(client, "Jin")
    earn(client, "lavender-leap", 10, 80)  # earn 80 coins
    buy = client.post("/api/store/buy", json={"kind": "item", "key": "double_jump"})
    assert buy.status_code == 200, buy.text
    assert buy.json()["items"]["double_jump"] == 10  # one pack = 10 charges
    use = client.post("/api/use", json={"item": "double_jump"})
    assert use.json()["items"]["double_jump"] == 9   # each jump spends one


def test_rocket_booster_buy_and_use(client):
    reg(client, "Rio")
    earn(client, "dont-look-down", 100, 40)
    buy = client.post("/api/store/buy", json={"kind": "item", "key": "rocket_booster"})
    assert buy.status_code == 200, buy.text
    assert buy.json()["items"]["rocket_booster"] == 1
    use = client.post("/api/use", json={"item": "rocket_booster"})
    assert use.json()["items"].get("rocket_booster", 0) == 0


def test_buy_without_enough_coins(client):
    reg(client, "Broke")
    r = client.post("/api/store/buy", json={"kind": "item", "key": "double_jump"})  # costs 60, has 0
    assert r.status_code == 402


def test_buy_unknown_item(client):
    reg(client, "Nope")
    r = client.post("/api/store/buy", json={"kind": "item", "key": "does-not-exist"})
    assert r.status_code == 422


def test_use_item_you_dont_have(client):
    reg(client, "Empty")
    assert client.post("/api/use", json={"item": "revive"}).status_code == 409


# ---------- Global leaderboard name opt-out ----------

def test_name_shown_by_default_then_opt_out(client):
    reg(client, "Shown")
    earn(client, "dont-look-down", 300, 1)
    board = client.get("/api/leaderboard/global", params={"game": "dont-look-down"}).json()
    assert any(r["username"] == "Shown" for r in board)        # default: visible

    client.post("/api/profile", json={"showName": False})       # opt out
    board2 = client.get("/api/leaderboard/global", params={"game": "dont-look-down"}).json()
    assert not any(r["username"] == "Shown" for r in board2)     # hidden from global
    mine = client.get("/api/leaderboard/personal", params={"game": "dont-look-down"}).json()
    assert mine and mine[0]["score"] == 300                      # but still on their own board
