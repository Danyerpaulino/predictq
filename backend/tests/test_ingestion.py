import json
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models import Market, MarketSnapshot
from app.services.ingestion import PolymarketIngestionService


def make_api_market(**overrides) -> dict:
    base = {
        "id": "ingest-001",
        "question": "Will ETH hit 5k?",
        "slug": "eth-5k",
        "description": "Test market",
        "conditionId": "0xdef",
        "outcomes": '["Yes", "No"]',
        "outcomePrices": '["0.45", "0.55"]',
        "clobTokenIds": '["t1", "t2"]',
        "volumeNum": 50000,
        "liquidityNum": 12000,
        "volume24hr": 3000,
        "lastTradePrice": 0.45,
        "bestBid": 0.44,
        "bestAsk": 0.46,
        "spread": 0.02,
        "oneDayPriceChange": 0.01,
        "oneWeekPriceChange": -0.02,
        "active": True,
        "closed": False,
    }
    base.update(overrides)
    return base


def mock_response(markets: list[dict], status_code: int = 200) -> httpx.Response:
    return httpx.Response(
        status_code=status_code,
        json=markets,
        request=httpx.Request("GET", "https://test"),
    )


async def test_normalize_market_parses_valid_data():
    service = PolymarketIngestionService(
        session_factory=AsyncMock(),
        api_url="https://test",
    )
    raw = make_api_market()
    result = service.normalize_market(raw)

    assert result is not None
    assert result["id"] == "ingest-001"
    assert result["question"] == "Will ETH hit 5k?"
    assert result["volume_num"] == 50000.0
    assert result["active"] is True


async def test_normalize_market_rejects_missing_id():
    service = PolymarketIngestionService(
        session_factory=AsyncMock(),
        api_url="https://test",
    )
    raw = make_api_market()
    del raw["id"]
    result = service.normalize_market(raw)

    assert result is None


async def test_normalize_market_rejects_missing_question():
    service = PolymarketIngestionService(
        session_factory=AsyncMock(),
        api_url="https://test",
    )
    raw = make_api_market()
    del raw["question"]
    result = service.normalize_market(raw)

    assert result is None


async def test_normalize_handles_missing_optional_fields():
    service = PolymarketIngestionService(
        session_factory=AsyncMock(),
        api_url="https://test",
    )
    raw = {"id": "minimal-001", "question": "Minimal market?"}
    result = service.normalize_market(raw)

    assert result is not None
    assert result["id"] == "minimal-001"
    assert result["volume_num"] == 0.0
    assert result["active"] is True
    assert result["slug"] is None


async def test_persist_inserts_new_market(engine):
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    service = PolymarketIngestionService(
        session_factory=session_factory,
        api_url="https://test",
    )
    raw = make_api_market(id="persist-new-001")
    normalized = service.normalize_market(raw)

    await service.persist_markets([normalized])

    async with session_factory() as session:
        market = await session.get(Market, "persist-new-001")
        assert market is not None
        assert market.question == "Will ETH hit 5k?"

        result = await session.execute(
            select(MarketSnapshot).where(
                MarketSnapshot.market_id == "persist-new-001"
            )
        )
        snapshots = result.scalars().all()
        assert len(snapshots) == 1


async def test_persist_upserts_existing_market(engine):
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    service = PolymarketIngestionService(
        session_factory=session_factory,
        api_url="https://test",
    )

    raw_v1 = make_api_market(id="upsert-001", volumeNum=1000)
    normalized_v1 = service.normalize_market(raw_v1)
    await service.persist_markets([normalized_v1])

    async with session_factory() as session:
        market_v1 = await session.get(Market, "upsert-001")
        first_seen = market_v1.first_seen_at

    raw_v2 = make_api_market(id="upsert-001", volumeNum=9999)
    normalized_v2 = service.normalize_market(raw_v2)
    await service.persist_markets([normalized_v2])

    async with session_factory() as session:
        market_v2 = await session.get(Market, "upsert-001")
        assert market_v2.volume_num == 9999.0
        assert market_v2.first_seen_at == first_seen


async def test_fetch_handles_api_error():
    service = PolymarketIngestionService(
        session_factory=AsyncMock(),
        api_url="https://test",
    )

    mock_resp = httpx.Response(
        status_code=500,
        text="Internal Server Error",
        request=httpx.Request("GET", "https://test"),
    )

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_resp):
        with pytest.raises(httpx.HTTPStatusError):
            await service.fetch_all_markets()
