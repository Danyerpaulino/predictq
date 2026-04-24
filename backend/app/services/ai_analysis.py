import json
import logging
from datetime import UTC, datetime, timedelta
from statistics import stdev

from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import Market, MarketSnapshot

logger = logging.getLogger(__name__)


def compute_market_stats(
    snapshots: list[MarketSnapshot],
) -> dict:
    if len(snapshots) < 2:
        return {
            "data_points": len(snapshots),
            "insufficient_data": True,
            "price_change": None,
            "volatility": None,
            "momentum": None,
            "direction": "unknown",
            "high": None,
            "low": None,
        }

    prices = [s.last_trade_price for s in snapshots if s.last_trade_price is not None]
    if len(prices) < 2:
        return {
            "data_points": len(snapshots),
            "insufficient_data": True,
            "price_change": None,
            "volatility": None,
            "momentum": None,
            "direction": "unknown",
            "high": None,
            "low": None,
        }

    price_change = prices[-1] - prices[0]
    deltas = [prices[i + 1] - prices[i] for i in range(len(prices) - 1)]
    volatility = stdev(deltas) if len(deltas) >= 2 else 0.0

    midpoint = len(prices) // 2
    first_half_avg = sum(prices[:midpoint]) / midpoint if midpoint > 0 else prices[0]
    second_half_avg = (
        sum(prices[midpoint:]) / len(prices[midpoint:]) if len(prices[midpoint:]) > 0 else prices[-1]
    )
    momentum = second_half_avg - first_half_avg

    if price_change > 0.01:
        direction = "bullish"
    elif price_change < -0.01:
        direction = "bearish"
    else:
        direction = "stable"

    return {
        "data_points": len(prices),
        "insufficient_data": False,
        "price_change": round(price_change, 6),
        "volatility": round(volatility, 6),
        "momentum": round(momentum, 6),
        "direction": direction,
        "high": round(max(prices), 6),
        "low": round(min(prices), 6),
    }


async def get_snapshots_for_analysis(
    session: AsyncSession,
    market_id: str,
    hours: int = 24,
) -> list[MarketSnapshot]:
    cutoff = datetime.now(UTC) - timedelta(hours=hours)
    query = (
        select(MarketSnapshot)
        .where(
            MarketSnapshot.market_id == market_id,
            MarketSnapshot.recorded_at >= cutoff,
        )
        .order_by(MarketSnapshot.recorded_at.asc())
    )
    result = await session.execute(query)
    return list(result.scalars().all())


async def analyze_market(
    session: AsyncSession,
    market_id: str,
) -> dict:
    market = await session.get(Market, market_id)
    if market is None:
        return {"error": "market_not_found"}

    snapshots = await get_snapshots_for_analysis(session, market_id)
    stats = compute_market_stats(snapshots)

    if stats["insufficient_data"]:
        return {
            "market_id": market_id,
            "trend": "unknown",
            "confidence": 0.0,
            "summary": "Insufficient historical data to perform trend analysis. The market needs more snapshot data points before meaningful analysis is possible.",
            "key_observations": [
                f"Only {stats['data_points']} data point(s) available",
                "Check back after the ingestion service has collected more snapshots",
            ],
            "stats": stats,
        }

    prompt = _build_analysis_prompt(market, stats)

    try:
        client = AsyncOpenAI(api_key=settings.openai_api_key)
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.3,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a prediction market analyst. Respond ONLY with valid JSON "
                        "containing these keys: trend (one of: bullish, bearish, stable, volatile), "
                        "confidence (float 0-1), summary (string, 2-3 sentences), "
                        "key_observations (array of 3-5 short strings)."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
        )

        raw = response.choices[0].message.content or "{}"
        parsed = json.loads(raw)

        return {
            "market_id": market_id,
            "trend": parsed.get("trend", "unknown"),
            "confidence": float(parsed.get("confidence", 0.0)),
            "summary": parsed.get("summary", ""),
            "key_observations": parsed.get("key_observations", []),
            "stats": stats,
        }

    except Exception:
        logger.exception("OpenAI analysis failed for market %s", market_id)
        return {
            "market_id": market_id,
            "trend": stats["direction"],
            "confidence": 0.3,
            "summary": f"AI analysis unavailable. Based on computed statistics: price moved {stats['price_change']:.4f} over the observation window with volatility of {stats['volatility']:.4f}.",
            "key_observations": [
                f"Direction: {stats['direction']}",
                f"Price change: {stats['price_change']:.4f}",
                f"Volatility: {stats['volatility']:.4f}",
                f"Range: {stats['low']:.4f} - {stats['high']:.4f}",
            ],
            "stats": stats,
        }


def _build_analysis_prompt(market: Market, stats: dict) -> str:
    return (
        f"Analyze this prediction market:\n\n"
        f"Question: {market.question}\n"
        f"Description: {market.description or 'N/A'}\n"
        f"Active: {market.active}, Closed: {market.closed}\n"
        f"Current price: {market.last_trade_price}\n"
        f"Volume: {market.volume_num}, Liquidity: {market.liquidity_num}\n"
        f"24h Volume: {market.volume_24hr}\n"
        f"1-day price change: {market.one_day_price_change}\n"
        f"1-week price change: {market.one_week_price_change}\n\n"
        f"Computed statistics from {stats['data_points']} snapshots:\n"
        f"- Price change over window: {stats['price_change']}\n"
        f"- Volatility (stdev of deltas): {stats['volatility']}\n"
        f"- Momentum (2nd half avg - 1st half avg): {stats['momentum']}\n"
        f"- Direction: {stats['direction']}\n"
        f"- High: {stats['high']}, Low: {stats['low']}\n\n"
        f"Provide a trend assessment with confidence level and key observations."
    )
