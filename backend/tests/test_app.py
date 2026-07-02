"""App-level surface: static/meta routes, the no-cache middleware, and the small
config/db engine helpers (the MySQL branch never runs under the SQLite test DB)."""


def test_hub_served_with_no_cache(client):
    r = client.get("/")
    assert r.status_code == 200
    assert "Stickmen" in r.text
    assert r.headers.get("cache-control") == "no-cache"


def test_meta_and_static_routes(client):
    assert client.get("/version.json").status_code == 200
    sw = client.get("/sw.js")
    assert sw.status_code == 200 and "javascript" in sw.headers["content-type"]
    assert client.get("/manifest.webmanifest").status_code == 200
    assert client.get("/shared/catalog.json").status_code == 200


def test_code_assets_get_no_cache_header(client):
    js = client.get("/shared/gamecenter.js")
    assert js.status_code == 200 and js.headers.get("cache-control") == "no-cache"
    html = client.get("/games/echo/index.html")
    assert html.status_code == 200 and html.headers.get("cache-control") == "no-cache"


def test_normalize_db_url_maps_mysql_and_adds_charset():
    from backend.config import _normalize_db_url
    u = _normalize_db_url("mysql://root:pw@host:3306/db")
    assert u.startswith("mysql+pymysql://") and "charset=utf8mb4" in u


def test_normalize_db_url_leaves_sqlite_alone():
    from backend.config import _normalize_db_url
    assert _normalize_db_url("sqlite:///x.db") == "sqlite:///x.db"


def test_make_engine_supports_mysql_and_sqlite():
    from backend.db import _make_engine
    assert _make_engine("mysql+pymysql://root@127.0.0.1/db").dialect.name == "mysql"  # lazy; no connect
    assert _make_engine("sqlite://").dialect.name == "sqlite"
