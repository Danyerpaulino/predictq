import pytest


async def test_health_endpoint(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_list_markets_empty(client):
    response = await client.get("/markets")
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total"] == 0


async def test_list_markets_returns_seeded(client, seeded_db):
    response = await client.get("/markets")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    ids = [m["id"] for m in data["items"]]
    assert "seeded-market-001" in ids


async def test_list_markets_search_filter(client, seeded_db):
    response = await client.get("/markets?search=BTC")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert all("BTC" in m["question"].upper() or "BTC" in (m["slug"] or "").upper() or "BTC" in (m["description"] or "").upper() for m in data["items"])


async def test_list_markets_search_no_match(client, seeded_db):
    response = await client.get("/markets?search=zzzznonexistent")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["items"] == []


async def test_list_markets_active_only_filter(client, seeded_db):
    response = await client.get("/markets?active_only=true")
    assert response.status_code == 200
    data = response.json()
    for market in data["items"]:
        assert market["active"] is True


async def test_list_markets_sort_by_volume(client, seeded_db):
    response = await client.get("/markets?sort_by=volume_24hr&sort_order=desc")
    assert response.status_code == 200
    data = response.json()
    volumes = [m["volume_24hr"] or 0 for m in data["items"]]
    assert volumes == sorted(volumes, reverse=True)


async def test_get_market_by_id(client, seeded_db):
    response = await client.get("/markets/seeded-market-001")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "seeded-market-001"
    assert data["question"] == "Will BTC exceed 100k by end of 2025?"


async def test_get_market_not_found(client):
    response = await client.get("/markets/nonexistent-id")
    assert response.status_code == 404


async def test_market_history_returns_snapshots(client, seeded_db):
    response = await client.get("/markets/seeded-market-001/history?hours=24")
    assert response.status_code == 200
    data = response.json()
    assert data["market_id"] == "seeded-market-001"
    assert data["hours"] == 24
    assert len(data["snapshots"]) == 10

    timestamps = [s["recorded_at"] for s in data["snapshots"]]
    assert timestamps == sorted(timestamps)


async def test_market_history_respects_hours_filter(client, seeded_db):
    response = await client.get("/markets/seeded-market-001/history?hours=1")
    assert response.status_code == 200
    data = response.json()
    assert len(data["snapshots"]) < 10


async def test_market_history_not_found(client):
    response = await client.get("/markets/nonexistent-id/history")
    assert response.status_code == 404
