import asyncio
import logging
from collections.abc import AsyncIterator, Sequence
from datetime import UTC, datetime
from typing import Any

import httpx
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.config import settings
from app.models import Market, MarketSnapshot

logger = logging.getLogger(__name__)


JsonDict = dict[str, Any]
SessionFactory = async_sessionmaker[AsyncSession]


class PolymarketIngestionService:
    def __init__(
        self,
        session_factory: SessionFactory,
        api_url: str = settings.polymarket_api_url,
        poll_interval_seconds: int = settings.poll_interval_seconds,
        page_size: int = 100,
        request_timeout_seconds: float = 30.0,
    ) -> None:
        self.session_factory = session_factory
        self.api_url = api_url
        self.poll_interval_seconds = poll_interval_seconds
        self.page_size = page_size
        self.request_timeout_seconds = request_timeout_seconds

    async def run_forever(self) -> None:
        while True:
            try:
                await self.run_once()
            except asyncio.CancelledError:
                logger.info("Polymarket ingestion loop cancelled")
                raise
            except Exception:
                logger.exception("Polymarket ingestion cycle failed")

            await asyncio.sleep(self.poll_interval_seconds)

    async def run_once(self) -> None:
        markets = await self.fetch_all_markets()
        if markets:
            await self.persist_markets(markets)
            logger.info("Ingested %s markets from Polymarket", len(markets))
        else:
            logger.warning("Polymarket ingestion returned no markets")

    async def fetch_all_markets(self) -> list[JsonDict]:
        async with httpx.AsyncClient(timeout=self.request_timeout_seconds) as client:
            normalized_markets: list[JsonDict] = []
            async for page in self.iter_market_pages(client):
                normalized_markets.extend(page)
            return normalized_markets

    async def iter_market_pages(
        self, client: httpx.AsyncClient
    ) -> AsyncIterator[list[JsonDict]]:
        offset = 0

        while True:
            response = await client.get(
                self.api_url,
                params={"limit": self.page_size, "offset": offset},
            )
            response.raise_for_status()

            payload = response.json()
            if not isinstance(payload, list):
                raise ValueError("Expected Polymarket API to return a list of markets")

            normalized_page = [
                normalized
                for market in payload
                if isinstance(market, dict)
                for normalized in [self.normalize_market(market)]
                if normalized is not None
            ]
            if normalized_page:
                yield normalized_page

            if len(payload) < self.page_size:
                break

            offset += self.page_size

    UPSERT_COLUMNS = (
        "question",
        "slug",
        "description",
        "condition_id",
        "outcomes",
        "outcome_prices",
        "clob_token_ids",
        "start_date",
        "end_date",
        "volume_num",
        "liquidity_num",
        "volume_24hr",
        "last_trade_price",
        "best_bid",
        "best_ask",
        "spread",
        "one_day_price_change",
        "one_week_price_change",
        "active",
        "closed",
        "image",
        "icon",
        "events",
    )

    BATCH_SIZE = 50

    async def persist_markets(self, markets: Sequence[JsonDict]) -> None:
        if not markets:
            return

        now = datetime.now(UTC)

        async with self.session_factory() as session:
            async with session.begin():
                for i in range(0, len(markets), self.BATCH_SIZE):
                    chunk = list(markets[i : i + self.BATCH_SIZE])
                    insert_stmt = pg_insert(Market).values(chunk)
                    update_columns = {
                        col: getattr(insert_stmt.excluded, col)
                        for col in self.UPSERT_COLUMNS
                    }
                    update_columns["updated_at"] = now
                    await session.execute(
                        insert_stmt.on_conflict_do_update(
                            index_elements=[Market.__table__.c.id],
                            set_=update_columns,
                        )
                    )

                    snapshot_chunk = [self.build_snapshot_row(m) for m in chunk]
                    await session.execute(
                        pg_insert(MarketSnapshot).values(snapshot_chunk)
                    )

    def normalize_market(self, market: JsonDict) -> JsonDict | None:
        market_id = self.pick_first_present_value(market, ("id", "marketId", "market_id"))
        question = self.pick_first_present_value(market, ("question", "title", "name"))
        if not market_id or not question:
            return None

        return {
            "id": str(market_id),
            "question": str(question),
            "slug": self.as_optional_str(market.get("slug")),
            "description": self.as_optional_str(market.get("description")),
            "condition_id": self.as_optional_str(
                self.pick_first_present_value(
                    market, ("conditionId", "condition_id", "condition_id_hex")
                )
            ),
            "outcomes": self.as_json_value(market.get("outcomes")),
            "outcome_prices": self.as_json_value(
                self.pick_first_present_value(
                    market, ("outcomePrices", "outcome_prices", "prices")
                )
            ),
            "clob_token_ids": self.as_json_value(
                self.pick_first_present_value(market, ("clobTokenIds", "clob_token_ids"))
            ),
            "start_date": self.parse_datetime(
                self.pick_first_present_value(market, ("startDate", "start_date"))
            ),
            "end_date": self.parse_datetime(
                self.pick_first_present_value(market, ("endDate", "end_date"))
            ),
            "volume_num": self.parse_float(
                self.pick_first_present_value(market, ("volumeNum", "volume", "volume_num")),
                default=0.0,
            ),
            "liquidity_num": self.parse_float(
                self.pick_first_present_value(
                    market, ("liquidityNum", "liquidity", "liquidity_num")
                ),
                default=0.0,
            ),
            "volume_24hr": self.parse_float(
                self.pick_first_present_value(market, ("volume24hr", "volume24Hr")),
                default=0.0,
            ),
            "last_trade_price": self.parse_float(
                self.pick_first_present_value(
                    market, ("lastTradePrice", "last_trade_price")
                )
            ),
            "best_bid": self.parse_float(
                self.pick_first_present_value(market, ("bestBid", "best_bid"))
            ),
            "best_ask": self.parse_float(
                self.pick_first_present_value(market, ("bestAsk", "best_ask"))
            ),
            "spread": self.parse_float(market.get("spread")),
            "one_day_price_change": self.parse_float(
                self.pick_first_present_value(
                    market, ("oneDayPriceChange", "one_day_price_change")
                )
            ),
            "one_week_price_change": self.parse_float(
                self.pick_first_present_value(
                    market, ("oneWeekPriceChange", "one_week_price_change")
                )
            ),
            "active": self.parse_bool(market.get("active"), default=True),
            "closed": self.parse_bool(market.get("closed"), default=False),
            "image": self.as_optional_str(market.get("image")),
            "icon": self.as_optional_str(market.get("icon")),
            "events": self.as_json_value(market.get("events")),
        }

    def build_snapshot_row(self, market: JsonDict) -> JsonDict:
        return {
            "market_id": market["id"],
            "outcome_prices": market.get("outcome_prices"),
            "last_trade_price": market.get("last_trade_price"),
            "volume_num": market.get("volume_num"),
            "liquidity_num": market.get("liquidity_num"),
        }

    @staticmethod
    def pick_first_present_value(
        payload: JsonDict, keys: Sequence[str]
    ) -> Any | None:
        for key in keys:
            value = payload.get(key)
            if value not in (None, ""):
                return value
        return None

    @staticmethod
    def as_optional_str(value: Any) -> str | None:
        if value in (None, ""):
            return None
        return str(value)

    @staticmethod
    def as_json_value(value: Any) -> Any | None:
        return value if value is not None else None

    @staticmethod
    def parse_float(value: Any, default: float | None = None) -> float | None:
        if value in (None, ""):
            return default
        try:
            return float(value)
        except (TypeError, ValueError):
            return default

    @staticmethod
    def parse_bool(value: Any, default: bool = False) -> bool:
        if value is None:
            return default
        if isinstance(value, bool):
            return value
        if isinstance(value, (int, float)):
            return bool(value)
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"1", "true", "yes"}:
                return True
            if normalized in {"0", "false", "no"}:
                return False
        return default

    @staticmethod
    def parse_datetime(value: Any) -> datetime | None:
        if not isinstance(value, str) or not value:
            return None

        normalized = value.replace("Z", "+00:00")
        try:
            return datetime.fromisoformat(normalized)
        except ValueError:
            logger.warning("Unable to parse datetime value from Polymarket: %r", value)
            return None
