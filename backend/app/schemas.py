from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


JsonCollection = list[Any] | dict[str, Any] | None


class MarketBase(BaseModel):
    id: str
    question: str
    slug: str | None
    description: str | None
    condition_id: str | None
    outcomes: JsonCollection
    outcome_prices: JsonCollection
    clob_token_ids: JsonCollection
    start_date: datetime | None
    end_date: datetime | None
    volume_num: float | None
    liquidity_num: float | None
    volume_24hr: float | None
    last_trade_price: float | None
    best_bid: float | None
    best_ask: float | None
    spread: float | None
    one_day_price_change: float | None
    one_week_price_change: float | None
    active: bool
    closed: bool
    image: str | None
    icon: str | None
    events: JsonCollection
    first_seen_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MarketListItem(MarketBase):
    pass


class MarketDetail(MarketBase):
    pass


class MarketSnapshotResponse(BaseModel):
    id: int
    market_id: str
    outcome_prices: JsonCollection
    last_trade_price: float | None
    volume_num: float | None
    liquidity_num: float | None
    recorded_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MarketsListResponse(BaseModel):
    items: list[MarketListItem]
    total: int
    limit: int
    offset: int


class MarketHistoryResponse(BaseModel):
    market_id: str
    hours: int
    snapshots: list[MarketSnapshotResponse]
