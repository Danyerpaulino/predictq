# PredictQ — Market Intelligence Dashboard

> Real-time Polymarket prediction market dashboard with AI-powered trend analysis.

## Overview

PredictQ is a full-stack application that polls the Polymarket API for live prediction market data, stores it in PostgreSQL with historical tracking, exposes a REST API, and surfaces it through an interactive Next.js dashboard. An AI-powered trend analyzer pre-computes statistics from historical snapshots before sending them to GPT-4o-mini for structured analysis.

## Architecture

```
Polymarket API
      │
      ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Ingestion   │────▶│  PostgreSQL  │◀────│   FastAPI     │
│  Service     │     │  (markets +  │     │   REST API    │
│  (45s poll)  │     │  snapshots)  │     │               │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                                           ┌──────┴───────┐
                                           │              │
                                           ▼              ▼
                                    ┌────────────┐ ┌────────────┐
                                    │  Next.js   │ │  OpenAI    │
                                    │  Frontend  │ │  GPT-4o    │
                                    │  Dashboard │ │  Analysis  │
                                    └────────────┘ └────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI + Pydantic + SQLAlchemy (async) |
| Database | PostgreSQL 16 with Alembic migrations |
| Frontend | Next.js 16 (App Router) + SWR + Recharts + Tailwind CSS |
| AI | OpenAI GPT-4o-mini with structured JSON output |
| Infra | Docker Compose (local) |

## Features

- **Real-time market data ingestion** — Polls Polymarket every 45 seconds with paginated fetching and atomic upserts
- **Historical price tracking** — Time-series snapshots table records every market state at each poll cycle
- **Searchable dashboard** — Full-text search across question, slug, and description with debounced input
- **Filter and sort** — Toggle active-only, sort by volume/liquidity/price/date in either direction
- **Interactive price charts** — Recharts area chart with selectable time ranges (1h to 7d) and live polling
- **AI-powered trend analysis** — Pre-computes volatility, momentum, and direction from snapshots, then sends structured prompt to GPT-4o-mini for trend assessment with confidence scoring
- **Market detail pages** — Full market view with outcomes, stats grid, price history, and AI insights

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Node.js 20+
- Python 3.12+
- OpenAI API key

### Quick Start (Docker)

```bash
# 1. Clone the repo
git clone https://github.com/Danyerpaulino/predictq.git
cd predictq

# 2. Set up environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# 3. Start all services
docker compose up

# 4. Open the dashboard
open http://localhost:3000
```

The backend runs migrations automatically on startup. Market data begins ingesting after ~45 seconds.

### Local Development (without Docker)

```bash
# 1. Start Postgres
docker compose up db -d

# 2. Set up environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# 3. Backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# 4. Frontend (in a separate terminal)
cd frontend
npm install
npm run dev
```

## API Reference

| Endpoint | Method | Description | Query Params |
|----------|--------|-------------|-------------|
| `/markets` | GET | Paginated market list | `limit`, `offset`, `search`, `active_only`, `sort_by`, `sort_order` |
| `/markets/{id}` | GET | Single market detail | — |
| `/markets/{id}/history` | GET | Price history snapshots | `hours` (default 24, max 720) |
| `/ai/analyze` | POST | AI trend analysis | Body: `{ "market_id": "..." }` |
| `/health` | GET | Health check | — |

### Example: List Markets

```bash
curl "http://localhost:8000/markets?limit=10&sort_by=volume_num&sort_order=desc"
```

### Example: AI Analysis

```bash
curl -X POST "http://localhost:8000/ai/analyze" \
  -H "Content-Type: application/json" \
  -d '{"market_id": "some-market-id"}'
```

Response:
```json
{
  "market_id": "some-market-id",
  "trend": "bullish",
  "confidence": 0.82,
  "summary": "The market shows strong upward momentum...",
  "key_observations": [
    "Price increased steadily over the observation window",
    "Volume remains healthy at $25,000 in 24h",
    "Low volatility suggests sustained trend"
  ],
  "stats": {
    "data_points": 10,
    "price_change": 0.045,
    "volatility": 0.003,
    "momentum": 0.02,
    "direction": "bullish",
    "high": 0.725,
    "low": 0.68
  }
}
```

## Database Schema

### `markets` table

Upserted each poll cycle. Primary key is Polymarket's string ID. Tracks all pricing, volume, liquidity, and status fields. Indexed on `(active, volume_num DESC)` for the default sorted listing.

### `market_snapshots` table

One row per market per poll. Stores `outcome_prices`, `last_trade_price`, `volume_num`, and `liquidity_num` at each point in time. Indexed on `(market_id, recorded_at)` for efficient history queries.

This two-table design enables the AI feature — without historical snapshots, trend analysis would be limited to the single latest state.

## AI Feature: Market Trend Analyzer

The AI analysis is deliberately more than a prompt wrapper:

1. **Query snapshots** from `market_snapshots` for the last 24 hours
2. **Compute statistics** from the time series:
   - `price_change` — delta between first and last price
   - `volatility` — standard deviation of price deltas
   - `momentum` — difference between second-half and first-half average prices
   - `direction` — classified as bullish/bearish/stable based on thresholds
   - `high`/`low` — price range over the window
3. **Build prompt** with computed stats + market metadata
4. **Call GPT-4o-mini** with `response_format={"type": "json_object"}` and temperature=0.3
5. **Parse response** into structured output: trend, confidence, summary, key observations

If the OpenAI call fails, the endpoint falls back to statistics-only analysis rather than returning an error.

## Testing

The test suite runs against a real PostgreSQL instance. OpenAI calls are mocked at the HTTP boundary.

```bash
# Start Postgres
docker compose up db -d

# Create test database
docker exec -it predictq-db-1 psql -U postgres -c "CREATE DATABASE predictq_test;"

# Run tests
cd backend
source .venv/bin/activate
pip install -r requirements-dev.txt
pytest -v
```

### Test Coverage

| Module | Tests | What's Covered |
|--------|-------|---------------|
| `test_models.py` | 4 | ORM field mapping, FK relationships, Pydantic serialization |
| `test_ingestion.py` | 7 | Normalize valid/invalid data, missing fields, insert/upsert, API errors |
| `test_markets_api.py` | 11 | All REST endpoints: list, search, filter, sort, detail, history, 404s |
| `test_ai_analysis.py` | 7 | `compute_market_stats` edge cases, AI endpoint with mocked OpenAI, insufficient data |

## Design Decisions & Tradeoffs

- **In-process asyncio ingestion vs. Celery** — The ingestion service runs as an `asyncio.Task` inside the FastAPI lifespan. This avoids extra infrastructure (Redis, Celery workers) and shares the event loop with the API. For a single-server deployment this is simpler and sufficient.

- **Async SQLAlchemy** — Using `asyncpg` with SQLAlchemy's async API means database I/O doesn't block the event loop. The ingestion service and API handlers share the same async session factory.

- **SWR over React Query** — SWR is lighter and sufficient for a read-heavy dashboard. The 30-second polling interval keeps data fresh without WebSocket complexity.

- **next.config.ts rewrites** — The frontend proxies `/api/*` to the backend, eliminating CORS issues in development and simplifying the client-side fetch logic.

- **JSONB for outcomes** — Markets have variable outcome counts (2 for Yes/No, more for multi-outcome). JSONB avoids a join table and maps cleanly to the Polymarket API shape.

- **Snapshot-based AI analysis** — Pre-computing statistics from historical data before calling GPT means the AI feature depends on the data pipeline, not just prompt engineering. This demonstrates system design, not just API wrapping.

## What I'd Do With More Time

- WebSocket/SSE for real-time price pushes instead of polling
- Cross-market correlation analysis (AI comparing related markets)
- Redis caching layer for frequently accessed market lists
- Rate limiting and request throttling on the API
- User accounts with watchlists and alerts
- Production Dockerfiles with multi-stage builds
- CI/CD pipeline with automated testing
