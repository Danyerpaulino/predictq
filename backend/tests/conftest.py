import asyncio
from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.database import get_session
from app.models import Base, Market, MarketSnapshot

TEST_DATABASE_URL = settings.database_url.replace("/predictq", "/predictq_test")


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def engine():
    eng = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await eng.dispose()


@pytest.fixture
async def db_session(engine) -> AsyncIterator[AsyncSession]:
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        async with session.begin():
            yield session
            await session.rollback()


@pytest.fixture
async def client(engine, db_session) -> AsyncIterator[AsyncClient]:
    from app.main import app

    async def override_get_session():
        yield db_session

    app.dependency_overrides[get_session] = override_get_session

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
def sample_market_data() -> dict:
    return {
        "id": "test-market-001",
        "question": "Will it rain tomorrow in NYC?",
        "slug": "will-it-rain-tomorrow-nyc",
        "description": "Resolves Yes if official NYC weather station records rainfall.",
        "conditionId": "0xabc123",
        "outcomes": '["Yes", "No"]',
        "outcomePrices": '["0.65", "0.35"]',
        "clobTokenIds": '["tok1", "tok2"]',
        "startDate": "2025-01-01T00:00:00Z",
        "endDate": "2025-12-31T23:59:59Z",
        "volumeNum": 150000.0,
        "liquidityNum": 45000.0,
        "volume24hr": 8500.0,
        "lastTradePrice": 0.65,
        "bestBid": 0.64,
        "bestAsk": 0.66,
        "spread": 0.02,
        "oneDayPriceChange": 0.03,
        "oneWeekPriceChange": -0.05,
        "active": True,
        "closed": False,
        "image": "https://example.com/market.png",
        "icon": "https://example.com/icon.png",
        "events": [{"slug": "weather"}],
    }


@pytest.fixture
async def seeded_db(db_session: AsyncSession) -> Market:
    market = Market(
        id="seeded-market-001",
        question="Will BTC exceed 100k by end of 2025?",
        slug="btc-100k-2025",
        description="Resolves Yes if Bitcoin price exceeds $100,000 USD.",
        active=True,
        closed=False,
        volume_num=500000.0,
        liquidity_num=120000.0,
        volume_24hr=25000.0,
        last_trade_price=0.72,
        best_bid=0.71,
        best_ask=0.73,
        spread=0.02,
        one_day_price_change=0.05,
        one_week_price_change=0.12,
        outcomes=["Yes", "No"],
        outcome_prices=["0.72", "0.28"],
    )
    db_session.add(market)

    now = datetime.now(UTC)
    snapshots = []
    for i in range(10):
        snapshots.append(
            MarketSnapshot(
                market_id="seeded-market-001",
                outcome_prices=["0.72", "0.28"],
                last_trade_price=0.68 + (i * 0.005),
                volume_num=500000.0 + (i * 100),
                liquidity_num=120000.0,
                recorded_at=now - timedelta(hours=10 - i),
            )
        )
    db_session.add_all(snapshots)
    await db_session.flush()

    return market
