def reg(client, username="Alice", password="hunter2", avatar=None):
    return client.post("/api/register", json={"username": username, "password": password, "avatar": avatar})


def test_register_then_me(client):
    r = reg(client)
    assert r.status_code == 200, r.text
    assert r.json()["username"] == "Alice"
    me = client.get("/api/me")
    assert me.status_code == 200
    assert me.json()["coins"] == 0
    assert me.json()["avatarKey"]  # got a free starter


def test_duplicate_username_case_insensitive(client):
    assert reg(client, "Alice").status_code == 200
    dup = reg(client, "alice")
    assert dup.status_code == 409


def test_password_must_exceed_four_chars(client):
    r = reg(client, "Bob", "1234")
    assert r.status_code == 422


def test_login_wrong_password(client):
    reg(client, "Carol", "rightpass")
    client.post("/api/logout")
    bad = client.post("/api/login", json={"username": "Carol", "password": "wrongpass"})
    assert bad.status_code == 401
    assert "username or password" in bad.json()["detail"].lower()


def test_login_success(client):
    reg(client, "Leo", "rightpass")
    client.post("/api/logout")
    ok = client.post("/api/login", json={"username": "Leo", "password": "rightpass"})
    assert ok.status_code == 200, ok.text
    assert ok.json()["username"] == "Leo"
    assert client.get("/api/me").status_code == 200  # session is live after login


def test_logout_ends_session(client):
    reg(client, "Mara")
    assert client.get("/api/me").status_code == 200
    client.post("/api/logout")
    assert client.get("/api/me").status_code == 401  # no longer authenticated


def test_me_requires_auth(client):
    assert client.get("/api/me").status_code == 401


def test_login_rate_limit_locks_out(client):
    reg(client, "Rate", "rightpass")
    client.post("/api/logout")
    for _ in range(5):  # exhaust the fail budget
        assert client.post("/api/login", json={"username": "Rate", "password": "nope"}).status_code == 401
    # even the correct password is now locked out for a while
    locked = client.post("/api/login", json={"username": "Rate", "password": "rightpass"})
    assert locked.status_code == 429
