from datetime import UTC, datetime, timedelta
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models import Market, MarketSnapshot
from app.schemas import (
    MarketDetail,
    MarketHistoryResponse,
    MarketListItem,
    MarketsListResponse,
    MarketSnapshotResponse,
)

router = APIRouter(prefix="/markets", tags=["markets"])

SortField = Literal[
    "volume_num",
    "liquidity_num",
    "volume_24hr",
    "last_trade_price",
    "updated_at",
    "end_date",
]
SortOrder = Literal["asc", "desc"]

SORTABLE_COLUMNS = {
    "volume_num": Market.volume_num,
    "liquidity_num": Market.liquidity_num,
    "volume_24hr": Market.volume_24hr,
    "last_trade_price": Market.last_trade_price,
    "updated_at": Market.updated_at,
    "end_date": Market.end_date,
}

SessionDependency = Annotated[AsyncSession, Depends(get_session)]


@router.get("", response_model=MarketsListResponse)
async def list_markets(
    session: SessionDependency,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    search: str | None = None,
    active_only: bool = True,
    sort_by: SortField = "volume_num",
    sort_order: SortOrder = "desc",
) -> MarketsListResponse:
    filters = []
    if active_only:
        filters.append(Market.active.is_(True))

    normalized_search = search.strip() if search else None
    if normalized_search:
        search_pattern = f"%{normalized_search}%"
        filters.append(
            or_(
                Market.question.ilike(search_pattern),
                Market.slug.ilike(search_pattern),
                Market.description.ilike(search_pattern),
            )
        )

    data_query = select(Market)
    count_query = select(func.count()).select_from(Market)

    for condition in filters:
        data_query = data_query.where(condition)
        count_query = count_query.where(condition)

    sort_column = SORTABLE_COLUMNS[sort_by]
    direction = sort_column.asc() if sort_order == "asc" else sort_column.desc()
    data_query = (
        data_query.order_by(direction, Market.id.asc()).offset(offset).limit(limit)
    )

    result = await session.execute(data_query)
    items = [MarketListItem.model_validate(market) for market in result.scalars().all()]
    total = int((await session.scalar(count_query)) or 0)

    return MarketsListResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/{market_id}", response_model=MarketDetail)
async def get_market(
    market_id: str,
    session: SessionDependency,
) -> MarketDetail:
    market = await session.get(Market, market_id)
    if market is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Market '{market_id}' was not found",
        )

    return MarketDetail.model_validate(market)


@router.get("/{market_id}/history", response_model=MarketHistoryResponse)
async def get_market_history(
    market_id: str,
    session: SessionDependency,
    hours: Annotated[int, Query(ge=1, le=24 * 30)] = 24,
) -> MarketHistoryResponse:
    market = await session.get(Market, market_id)
    if market is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Market '{market_id}' was not found",
        )

    cutoff = datetime.now(UTC) - timedelta(hours=hours)
    snapshots_query = (
        select(MarketSnapshot)
        .where(
            MarketSnapshot.market_id == market_id,
            MarketSnapshot.recorded_at >= cutoff,
        )
        .order_by(MarketSnapshot.recorded_at.asc(), MarketSnapshot.id.asc())
    )
    result = await session.execute(snapshots_query)
    snapshots = [
        MarketSnapshotResponse.model_validate(snapshot)
        for snapshot in result.scalars().all()
    ]

    return MarketHistoryResponse(
        market_id=market_id,
        hours=hours,
        snapshots=snapshots,
    )
