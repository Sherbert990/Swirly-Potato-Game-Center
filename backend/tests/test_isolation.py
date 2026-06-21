"""
Data isolation (IDOR) guards: a user can only ever read/modify their OWN data.
Identity comes only from the session cookie; no endpoint trusts a client-supplied
user id. These tests fail loudly if a future change breaks that invariant.
"""


def reg(client, u):
    return client.post("/api/register", json={"username": u, "password": "hunter2"})


def login(client, u):
    return client.post("/api/login", json={"username": u, "password": "hunter2"})


def test_wallets_and_scores_are_isolated_between_users(client):
    # Alice earns 10 coins.
    reg(client, "Alice")
    client.post("/api/score", json={"game": "dont-look-down", "score": 100, "coins": 10})

    # Brand-new user Bob starts clean — Alice's activity never touched him.
    reg(client, "Bob")
    assert client.get("/api/me").json()["coins"] == 0
    client.post("/api/score", json={"game": "dont-look-down", "score": 50, "coins": 5})
    assert client.get("/api/me").json()["coins"] == 5
    bob_board = client.get("/api/leaderboard/personal", params={"game": "dont-look-down"}).json()
    assert [r["score"] for r in bob_board] == [50]  # only Bob's run

    # Back to Alice — Bob's activity never touched her.
    login(client, "Alice")
    assert client.get("/api/me").json()["coins"] == 10
    alice_board = client.get("/api/leaderboard/personal", params={"game": "dont-look-down"}).json()
    assert [r["score"] for r in alice_board] == [100]  # only Alice's run


def test_client_supplied_user_id_is_ignored(client):
    # A malicious extra field trying to target another account must be ignored;
    # the write is attributed to the SESSION user, not the body.
    reg(client, "Carol")
    r = client.post("/api/score",
                    json={"game": "dont-look-down", "score": 77, "coins": 4, "user_id": 999999})
    assert r.status_code == 200
    assert r.json()["wallet"]["coins"] == 4   # credited to Carol, not user 999999
    board = client.get("/api/leaderboard/personal", params={"game": "dont-look-down"}).json()
    assert [r["score"] for r in board] == [77]


def test_profile_rename_cannot_take_over_another_user(client):
    reg(client, "Dave")
    client.post("/api/logout")
    reg(client, "Erin")  # now logged in as Erin
    # Erin tries to rename herself to Dave's name -> blocked, no overwrite of Dave.
    r = client.post("/api/profile", json={"username": "Dave"})
    assert r.status_code == 409
    # Dave's account is intact and still his.
    assert login(client, "Dave").status_code == 200


def test_no_session_no_access(client):
    assert client.get("/api/me").status_code == 401
    assert client.post("/api/score", json={"game": "dont-look-down", "score": 1, "coins": 1}).status_code == 401
    assert client.post("/api/store/buy", json={"kind": "item", "key": "revive"}).status_code == 401
