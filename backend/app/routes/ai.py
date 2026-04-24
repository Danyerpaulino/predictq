from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.services.ai_analysis import analyze_market

router = APIRouter(prefix="/ai", tags=["ai"])

SessionDependency = Annotated[AsyncSession, Depends(get_session)]


class AnalyzeRequest(BaseModel):
    market_id: str


class AnalyzeResponse(BaseModel):
    market_id: str
    trend: str
    confidence: float
    summary: str
    key_observations: list[str]
    stats: dict


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    body: AnalyzeRequest,
    session: SessionDependency,
) -> AnalyzeResponse:
    result = await analyze_market(session, body.market_id)

    if result.get("error") == "market_not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Market '{body.market_id}' was not found",
        )

    return AnalyzeResponse(**result)
