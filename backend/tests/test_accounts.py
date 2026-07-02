"""Account + economy branches the earlier suite didn't reach: register validation,
profile authorization, avatar store purchases, the session edge, and the score
rate limiter."""


def reg(client, u, pw="hunter2", avatar=None):
    body = {"username": u, "password": pw}
    if avatar:
        body["avatar"] = avatar
    return client.post("/api/register", json=body)


# ---- register validation ----
def test_password_over_72_bytes_rejected(client):
    assert reg(client, "LongPw", pw="x" * 80).status_code == 422


def test_blank_username_rejected(client):
    assert reg(client, "   ").status_code == 422


def test_register_with_premium_avatar_rejected(client):
    assert reg(client, "Fancy", avatar="dld-nova").status_code == 422   # must pick a free starter


def test_register_with_unknown_avatar_rejected(client):
    assert reg(client, "Ghosty", avatar="no-such-avatar").status_code == 422


# ---- profile authorization ----
def test_equip_free_avatar_ok(client):
    reg(client, "Equipper")
    r = client.post("/api/profile", json={"avatar": "dld-ember"})       # free
    assert r.status_code == 200 and r.json()["avatarKey"] == "dld-ember"


def test_equip_unowned_premium_forbidden(client):
    reg(client, "Wanter")
    assert client.post("/api/profile", json={"avatar": "dld-nova"}).status_code == 403


def test_equip_unknown_avatar_422(client):
    reg(client, "Nobody")
    assert client.post("/api/profile", json={"avatar": "no-such-avatar"}).status_code == 422


def test_rename_reflected_in_me(client):
    reg(client, "OldName")
    r = client.post("/api/profile", json={"username": "NewName"})
    assert r.status_code == 200 and r.json()["username"] == "NewName"
    assert client.get("/api/me").json()["username"] == "NewName"


# ---- avatar store economy ----
def test_buy_premium_avatar_then_equip_then_already_owned(client):
    reg(client, "Buyer")
    client.post("/api/score", json={"game": "dont-look-down", "score": 100, "coins": 100})
    r = client.post("/api/store/buy", json={"kind": "avatar", "key": "dld-nova"})   # 60
    assert r.status_code == 200
    assert r.json()["coins"] == 40 and "dld-nova" in r.json()["ownedAvatars"]
    eq = client.post("/api/profile", json={"avatar": "dld-nova"})
    assert eq.status_code == 200 and eq.json()["avatarKey"] == "dld-nova"
    assert client.post("/api/store/buy", json={"kind": "avatar", "key": "dld-nova"}).status_code == 409


def test_buy_avatar_insufficient_coins(client):
    reg(client, "Broke")
    assert client.post("/api/store/buy", json={"kind": "avatar", "key": "dld-cosmo"}).status_code == 402


def test_buy_free_avatar_is_already_owned(client):
    reg(client, "Freebie")
    assert client.post("/api/store/buy", json={"kind": "avatar", "key": "dld-ember"}).status_code == 409


def test_buy_unknown_avatar_422(client):
    reg(client, "Seeker")
    assert client.post("/api/store/buy", json={"kind": "avatar", "key": "no-such"}).status_code == 422


def test_buy_bad_kind_422(client):
    reg(client, "Kindless")
    assert client.post("/api/store/buy", json={"kind": "wat", "key": "x"}).status_code == 422


# ---- session edge ----
def test_session_valid_but_user_gone_401(client, db_session):
    from backend.models import User
    reg(client, "Vanish")
    u = db_session.query(User).filter_by(username_key="vanish").first()
    db_session.delete(u)
    db_session.flush()
    assert client.get("/api/me").status_code == 401


# ---- score rate limiter ----
def test_rapid_scores_are_rate_limited(client, monkeypatch):
    import backend.config as cfg
    from backend.routes.game_routes import _last_score_at
    monkeypatch.setattr(cfg, "SCORE_MIN_INTERVAL_SEC", 60)
    _last_score_at.clear()
    reg(client, "Rapid")
    assert client.post("/api/score", json={"game": "echo", "score": 1, "coins": 0}).status_code == 200
    assert client.post("/api/score", json={"game": "echo", "score": 2, "coins": 0}).status_code == 429
