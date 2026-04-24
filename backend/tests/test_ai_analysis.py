import json
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models import Market, MarketSnapshot
from app.services.ai_analysis import compute_market_stats


def make_snapshots(prices: list[float], hours_back: int = 10) -> list[MarketSnapshot]:
    now = datetime.now(UTC)
    snapshots = []
    for i, price in enumerate(prices):
        s = MarketSnapshot(
            id=i + 1,
            market_id="stats-test",
            last_trade_price=price,
            volume_num=1000.0,
            liquidity_num=500.0,
            outcome_prices=["0.50", "0.50"],
            recorded_at=now - timedelta(hours=hours_back - i),
        )
        snapshots.append(s)
    return snapshots


def test_compute_stats_insufficient_data_empty():
    stats = compute_market_stats([])
    assert stats["insufficient_data"] is True
    assert stats["data_points"] == 0
    assert stats["direction"] == "unknown"


def test_compute_stats_insufficient_data_single():
    snapshots = make_snapshots([0.50])
    stats = compute_market_stats(snapshots)
    assert stats["insufficient_data"] is True
    assert stats["data_points"] == 1


def test_compute_stats_bullish():
    prices = [0.40, 0.42, 0.45, 0.48, 0.52, 0.55]
    snapshots = make_snapshots(prices)
    stats = compute_market_stats(snapshots)

    assert stats["insufficient_data"] is False
    assert stats["direction"] == "bullish"
    assert stats["price_change"] > 0
    assert stats["high"] == 0.55
    assert stats["low"] == 0.40
    assert stats["data_points"] == 6


def test_compute_stats_bearish():
    prices = [0.70, 0.65, 0.60, 0.55, 0.50, 0.45]
    snapshots = make_snapshots(prices)
    stats = compute_market_stats(snapshots)

    assert stats["insufficient_data"] is False
    assert stats["direction"] == "bearish"
    assert stats["price_change"] < 0


def test_compute_stats_stable():
    prices = [0.50, 0.505, 0.50, 0.505, 0.50, 0.505]
    snapshots = make_snapshots(prices)
    stats = compute_market_stats(snapshots)

    assert stats["insufficient_data"] is False
    assert stats["direction"] == "stable"
    assert abs(stats["price_change"]) <= 0.01


def test_compute_stats_volatility():
    stable_prices = [0.50, 0.50, 0.50, 0.50]
    volatile_prices = [0.30, 0.70, 0.30, 0.70]

    stable_stats = compute_market_stats(make_snapshots(stable_prices))
    volatile_stats = compute_market_stats(make_snapshots(volatile_prices))

    assert volatile_stats["volatility"] > stable_stats["volatility"]


def test_compute_stats_momentum():
    rising_prices = [0.40, 0.42, 0.44, 0.50, 0.55, 0.60]
    snapshots = make_snapshots(rising_prices)
    stats = compute_market_stats(snapshots)

    assert stats["momentum"] > 0


async def test_ai_analyze_endpoint_returns_structured_response(client, seeded_db):
    mock_openai_response = MagicMock()
    mock_openai_response.choices = [
        MagicMock(
            message=MagicMock(
                content=json.dumps(
                    {
                        "trend": "bullish",
                        "confidence": 0.82,
                        "summary": "The market shows strong upward momentum with steady price increases.",
                        "key_observations": [
                            "Price increased steadily over the observation window",
                            "Volume remains healthy",
                            "Low volatility suggests sustained trend",
                        ],
                    }
                )
            )
        )
    ]

    with patch(
        "app.services.ai_analysis.AsyncOpenAI"
    ) as mock_openai_cls:
        mock_client = AsyncMock()
        mock_client.chat.completions.create = AsyncMock(
            return_value=mock_openai_response
        )
        mock_openai_cls.return_value = mock_client

        response = await client.post(
            "/ai/analyze",
            json={"market_id": "seeded-market-001"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["market_id"] == "seeded-market-001"
    assert data["trend"] == "bullish"
    assert data["confidence"] == 0.82
    assert len(data["key_observations"]) == 3
    assert "stats" in data


async def test_ai_analyze_endpoint_market_not_found(client):
    response = await client.post(
        "/ai/analyze",
        json={"market_id": "nonexistent"},
    )
    assert response.status_code == 404


async def test_ai_analyze_insufficient_data(client, db_session):
    market = Market(
        id="no-snapshots-001",
        question="Market with no history?",
        active=True,
        closed=False,
    )
    db_session.add(market)
    await db_session.flush()

    with patch(
        "app.services.ai_analysis.AsyncOpenAI"
    ) as mock_openai_cls:
        response = await client.post(
            "/ai/analyze",
            json={"market_id": "no-snapshots-001"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["trend"] == "unknown"
    assert data["confidence"] == 0.0
    assert "insufficient" in data["summary"].lower()
    mock_openai_cls.assert_not_called()
