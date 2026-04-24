from datetime import UTC, datetime

from app.models import Market, MarketSnapshot
from app.schemas import MarketDetail, MarketSnapshotResponse


async def test_market_model_fields(db_session):
    market = Market(
        id="model-test-001",
        question="Test market question?",
        slug="test-market",
        active=True,
        closed=False,
        volume_num=1000.0,
        liquidity_num=500.0,
        outcomes=["Yes", "No"],
        outcome_prices=["0.60", "0.40"],
    )
    db_session.add(market)
    await db_session.flush()

    assert market.id == "model-test-001"
    assert market.question == "Test market question?"
    assert market.active is True
    assert market.closed is False
    assert market.outcomes == ["Yes", "No"]


async def test_snapshot_links_to_market(db_session):
    market = Market(
        id="snap-link-001",
        question="Snapshot link test?",
        active=True,
        closed=False,
    )
    db_session.add(market)
    await db_session.flush()

    snapshot = MarketSnapshot(
        market_id="snap-link-001",
        last_trade_price=0.55,
        volume_num=1000.0,
        liquidity_num=400.0,
        outcome_prices=["0.55", "0.45"],
    )
    db_session.add(snapshot)
    await db_session.flush()

    assert snapshot.market_id == market.id
    assert snapshot.last_trade_price == 0.55


async def test_pydantic_schema_serializes_market(db_session):
    market = Market(
        id="schema-test-001",
        question="Schema serialize test?",
        slug="schema-test",
        active=True,
        closed=False,
        volume_num=2000.0,
        liquidity_num=800.0,
        outcomes=["Yes", "No"],
        outcome_prices=["0.70", "0.30"],
        first_seen_at=datetime(2025, 1, 1, tzinfo=UTC),
        updated_at=datetime(2025, 1, 2, tzinfo=UTC),
    )
    db_session.add(market)
    await db_session.flush()

    detail = MarketDetail.model_validate(market)
    assert detail.id == "schema-test-001"
    assert detail.outcomes == ["Yes", "No"]
    assert isinstance(detail.first_seen_at, datetime)


async def test_pydantic_schema_serializes_snapshot(db_session):
    market = Market(
        id="snap-schema-001",
        question="Snapshot schema test?",
        active=True,
        closed=False,
    )
    db_session.add(market)
    await db_session.flush()

    snapshot = MarketSnapshot(
        market_id="snap-schema-001",
        outcome_prices=["0.55", "0.45"],
        last_trade_price=0.55,
        volume_num=1000.0,
        liquidity_num=400.0,
        recorded_at=datetime(2025, 6, 1, tzinfo=UTC),
    )
    db_session.add(snapshot)
    await db_session.flush()

    response = MarketSnapshotResponse.model_validate(snapshot)
    assert response.market_id == "snap-schema-001"
    assert response.last_trade_price == 0.55
    assert isinstance(response.recorded_at, datetime)
