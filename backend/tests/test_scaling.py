"""Guards for the scaling-hardening behaviours: per-board score caps, the scores
table staying bounded, and seed upserting (not just inserting) reference data."""


def reg(client, u):
    return client.post("/api/register", json={"username": u, "password": "hunter2"})


def test_per_board_cap_rejects_absurd_scores(client):
    reg(client, "Capper")
    # Archery is capped at 5000 in the catalog.
    assert client.post("/api/score", json={"game": "archery-range", "score": 6000, "coins": 0}).status_code == 422
    assert client.post("/api/score", json={"game": "archery-range", "score": 60, "coins": 0}).status_code == 200


def test_open_board_still_allows_large_scores(client):
    reg(client, "Climber")
    # Don't Look Down is open-ended (no per-board cap) -> global MAX_SCORE applies.
    assert client.post("/api/score", json={"game": "dont-look-down", "score": 500000, "coins": 0}).status_code == 200


def test_coins_from_all_games_pool_into_one_wallet(client):
    """The platform's core promise: coins earned in DIFFERENT games land in the same
    wallet, and the store spends from it regardless of which game earned them."""
    reg(client, "Tycoon")
    client.post("/api/score", json={"game": "dont-look-down", "score": 100, "coins": 5})
    client.post("/api/score", json={"game": "archery-range", "score": 60, "coins": 8})
    w = client.post("/api/score", json={"game": "genesis", "score": 1, "coins": 3}).json()["wallet"]
    assert w["coins"] == 16                                   # 5 + 8 + 3, one wallet

    r = client.post("/api/store/buy", json={"kind": "item", "key": "gen_tap1"})    # 2
    assert r.status_code == 200 and r.json()["coins"] == 14
    r = client.post("/api/store/buy", json={"kind": "item", "key": "rip_retry"})   # 5 (a different game)
    assert r.status_code == 200 and r.json()["coins"] == 9    # spent across games from one balance


def test_scores_table_bounded_per_user_per_game(client, monkeypatch):
    import backend.config as cfg
    monkeypatch.setattr(cfg, "SCORES_KEEP_PER_GAME", 3)
    reg(client, "Pruner")
    for s in (10, 20, 30, 40, 50):
        assert client.post("/api/score", json={"game": "echo", "score": s, "coins": 0}).status_code == 200
    rows = client.get("/api/leaderboard/personal?game=echo").json()
    assert len(rows) == 3                         # pruned to the best N
    assert [r["score"] for r in rows] == [50, 40, 30]


def test_seed_upserts_existing_rows(db_session):
    """Editing a price in the catalog must propagate to an already-seeded DB."""
    from backend.models import StoreItem
    from backend.seed import seed
    it = db_session.get(StoreItem, "rip_retry")
    assert it is not None and it.price == 5
    it.price = 999
    db_session.flush()
    seed(db_session)                              # re-seed should restore the catalog value
    assert db_session.get(StoreItem, "rip_retry").price == 5
