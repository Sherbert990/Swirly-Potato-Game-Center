import datetime


def test_streak_day_one_has_no_bonus(client):
    r = client.post("/api/register", json={"username": "Streaky", "password": "hunter2"}).json()
    assert r["streak"] == 1
    assert r["dailyBonus"] == 0
    assert r["coins"] == 0  # fresh users still start at 0


def test_streak_increments_and_awards_next_day(client, db_session):
    from backend.models import User, UserDaily
    client.post("/api/register", json={"username": "Daily", "password": "hunter2"})
    u = db_session.query(User).filter_by(username_key="daily").first()
    row = db_session.get(UserDaily, u.id)
    row.last_date = datetime.date.today() - datetime.timedelta(days=1)  # pretend last visit was yesterday
    db_session.commit()
    me = client.get("/api/me").json()
    assert me["streak"] == 2
    assert me["dailyBonus"] > 0
    assert me["coins"] == me["dailyBonus"]  # bonus credited to the wallet


def test_streak_resets_after_a_gap(client, db_session):
    from backend.models import User, UserDaily
    client.post("/api/register", json={"username": "Gappy", "password": "hunter2"})
    u = db_session.query(User).filter_by(username_key="gappy").first()
    row = db_session.get(UserDaily, u.id)
    row.streak = 9
    row.last_date = datetime.date.today() - datetime.timedelta(days=3)  # missed days
    db_session.commit()
    me = client.get("/api/me").json()
    assert me["streak"] == 1  # reset, not continued
