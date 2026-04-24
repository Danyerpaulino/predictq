import asyncio
import logging
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import async_session
from app.routes import ai_router, markets_router
from app.services.ingestion import PolymarketIngestionService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)


def parse_cors_origins(raw_origins: str) -> list[str]:
    return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]


@asynccontextmanager
async def lifespan(app: FastAPI):
    ingestion_service = PolymarketIngestionService(async_session)
    ingestion_task = asyncio.create_task(
        ingestion_service.run_forever(), name="polymarket-ingestion"
    )
    app.state.ingestion_task = ingestion_task

    try:
        yield
    finally:
        ingestion_task.cancel()
        with suppress(asyncio.CancelledError):
            await ingestion_task


app = FastAPI(
    title="PredictQ API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=parse_cors_origins(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(markets_router)
app.include_router(ai_router)


@app.get("/health")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
