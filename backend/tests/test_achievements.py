def reg(client, u):
    return client.post("/api/register", json={"username": u, "password": "hunter2"})


def test_achievements_unlock_on_score(client):
    reg(client, "Achiever")
    r = client.post("/api/score", json={"game": "dont-look-down", "score": 600, "coins": 5}).json()
    keys = {a["key"] for a in r["unlocked"]}
    assert "getting-started" in keys   # any game, score>=1
    assert "first-climb" in keys       # dont-look-down score>=1
    assert "high-climber" in keys      # dont-look-down score>=500
    assert "sky-high" not in keys      # needs 2000
    assert "first-leap" not in keys    # wrong game


def test_achievements_not_double_unlocked(client):
    reg(client, "Twice")
    client.post("/api/score", json={"game": "dont-look-down", "score": 600, "coins": 5})
    again = client.post("/api/score", json={"game": "dont-look-down", "score": 700, "coins": 5}).json()
    keys = {a["key"] for a in again["unlocked"]}
    assert "first-climb" not in keys   # already unlocked, not re-awarded


def test_achievements_list_reflects_unlocks(client):
    reg(client, "Lister")
    client.post("/api/score", json={"game": "dont-look-down", "score": 600, "coins": 5})
    by = {a["key"]: a["unlocked"] for a in client.get("/api/achievements").json()}
    assert by["high-climber"] is True
    assert by["sky-high"] is False
    assert by["first-leap"] is False   # never played Lavender
