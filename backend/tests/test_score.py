from backend import config


def reg(client, username):
    return client.post("/api/register", json={"username": username, "password": "hunter2"})


def test_score_saved_and_credits_wallet(client):
    reg(client, "Dana")
    r = client.post("/api/score", json={"game": "dont-look-down", "score": 500, "coins": 10})
    assert r.status_code == 200, r.text
    assert r.json()["coins"] == 10
    board = client.get("/api/leaderboard/personal", params={"game": "dont-look-down"})
    assert board.status_code == 200
    assert board.json()[0]["score"] == 500


def test_coins_are_clamped(client):
    reg(client, "Evan")
    r = client.post("/api/score", json={"game": "dont-look-down", "score": 100, "coins": 999999})
    assert r.status_code == 200
    assert r.json()["coins"] == config.MAX_COINS_PER_SUBMIT  # not 999999


def test_impossible_score_rejected(client):
    reg(client, "Finn")
    r = client.post("/api/score", json={"game": "dont-look-down", "score": config.MAX_SCORE + 1, "coins": 5})
    assert r.status_code == 422


def test_score_requires_auth(client):
    # No registration → no session cookie. Identity comes only from the session,
    # so there is no way to post a score as someone else (IDOR-safe).
    r = client.post("/api/score", json={"game": "dont-look-down", "score": 100, "coins": 5})
    assert r.status_code == 401


def test_global_leaderboard_empty_is_ok(client):
    reg(client, "Gwen")
    r = client.get("/api/leaderboard/global", params={"game": "lavender-leap"})
    assert r.status_code == 200
    assert r.json() == []  # empty state, not a 500
