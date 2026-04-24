from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Index, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Market(Base):
    __tablename__ = "markets"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    question: Mapped[str] = mapped_column(Text)
    slug: Mapped[str | None] = mapped_column(String)
    description: Mapped[str | None] = mapped_column(Text)
    condition_id: Mapped[str | None] = mapped_column(String)
    outcomes: Mapped[dict | None] = mapped_column(JSONB)
    outcome_prices: Mapped[dict | None] = mapped_column(JSONB)
    clob_token_ids: Mapped[dict | None] = mapped_column(JSONB)
    start_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    end_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    volume_num: Mapped[float | None] = mapped_column(Float, default=0)
    liquidity_num: Mapped[float | None] = mapped_column(Float, default=0)
    volume_24hr: Mapped[float | None] = mapped_column(Float, default=0)
    last_trade_price: Mapped[float | None] = mapped_column(Float)
    best_bid: Mapped[float | None] = mapped_column(Float)
    best_ask: Mapped[float | None] = mapped_column(Float)
    spread: Mapped[float | None] = mapped_column(Float)
    one_day_price_change: Mapped[float | None] = mapped_column(Float)
    one_week_price_change: Mapped[float | None] = mapped_column(Float)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    closed: Mapped[bool] = mapped_column(Boolean, default=False)
    image: Mapped[str | None] = mapped_column(String)
    icon: Mapped[str | None] = mapped_column(String)
    events: Mapped[dict | None] = mapped_column(JSONB)
    first_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (Index("ix_markets_active_volume", "active", "volume_num"),)


class MarketSnapshot(Base):
    __tablename__ = "market_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    market_id: Mapped[str] = mapped_column(String, index=True)
    outcome_prices: Mapped[dict | None] = mapped_column(JSONB)
    last_trade_price: Mapped[float | None] = mapped_column(Float)
    volume_num: Mapped[float | None] = mapped_column(Float)
    liquidity_num: Mapped[float | None] = mapped_column(Float)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (
        Index("ix_snapshots_market_time", "market_id", "recorded_at"),
    )
