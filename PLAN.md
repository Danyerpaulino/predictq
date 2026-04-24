# PredictQ Market Intelligence Dashboard -- Implementation Plan

## Context

Build a full-stack prediction market dashboard for the PredictQ Founding Engineer Technical Challenge (2-hour timed build). The app ingests Polymarket data, stores it in PostgreSQL with historical tracking, exposes a REST API, and surfaces it via a Next.js dashboard with an AI-powered trend analyzer. Priority: working end-to-end pipeline over polish.

---

## Stack

- **Backend**: FastAPI + Pydantic + SQLAlchemy (async) + Alembic + asyncpg
- **Database**: PostgreSQL 16 (Docker for local dev)
- **Frontend**: Next.js 16.2.4 (App Router) + SWR + Recharts + Tailwind CSS
- **AI**: OpenAI (gpt-4o-mini, structured JSON output)
- **Infra**: Docker Compose (local) + Railway (production)

---

## 1. Project Structure

```
predictq/
├── docker-compose.yml
├── .env                            # Gitignored: OPENAI_API_KEY, DB creds
├── .gitignore
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── requirements-dev.txt        # pytest + test deps
│   ├── pytest.ini
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── versions/
│   │       └── 001_initial_schema.py
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI app, lifespan, CORS
│   │   ├── config.py               # pydantic-settings
│   │   ├── database.py             # Async engine + session factory
│   │   ├── models.py               # SQLAlchemy ORM models
│   │   ├── schemas.py              # Pydantic request/response schemas
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── markets.py          # GET /markets, /markets/{id}, /markets/{id}/history
│   │   │   └── ai.py               # POST /ai/analyze
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── ingestion.py        # Polymarket polling + upsert
│   │       └── ai_analysis.py      # Stats computation + OpenAI
│   └── tests/
│       ├── __init__.py
│       ├── conftest.py             # Fixtures: async DB, test client, sample data
│       ├── test_models.py          # Schema/model validation
│       ├── test_ingestion.py       # Ingestion service (mocked HTTP)
│       ├── test_markets_api.py     # Market endpoint integration tests
│       └── test_ai_analysis.py     # AI analysis (mocked OpenAI)
├── frontend/predictq/
│   ├── Dockerfile
│   ├── next.config.ts              # Rewrites: /api/* -> backend:8000/*
│   ├── app/
│   │   ├── layout.tsx              # App shell with header
│   │   ├── page.tsx                # Dashboard: market list
│   │   ├── loading.tsx
│   │   └── markets/[id]/
│   │       ├── page.tsx            # Market detail + chart + AI
│   │       └── loading.tsx
│   ├── components/
│   │   ├── MarketCard.tsx
│   │   ├── MarketList.tsx          # Client: SWR polling
│   │   ├── SearchBar.tsx
│   │   ├── FilterControls.tsx
│   │   ├── PriceChart.tsx          # recharts
│   │   └── AiInsights.tsx          # On-demand AI panel
│   └── lib/
│       ├── api.ts                  # Fetch helpers
│       └── types.ts                # TypeScript interfaces
```

---

## 2. Database Schema

### `markets` table (upserted each poll cycle)

| Column | Type | Notes |
|--------|------|-------|
| `id` | VARCHAR PK | Polymarket's string ID |
| `question` | TEXT | |
| `slug` | VARCHAR | |
| `description` | TEXT | |
| `condition_id` | VARCHAR | |
| `outcomes` | JSONB | e.g. `["Yes", "No"]` |
| `outcome_prices` | JSONB | e.g. `["0.65", "0.35"]` |
| `clob_token_ids` | JSONB | |
| `start_date` | TIMESTAMPTZ | |
| `end_date` | TIMESTAMPTZ | |
| `volume_num` | FLOAT | |
| `liquidity_num` | FLOAT | |
| `volume_24hr` | FLOAT | |
| `last_trade_price` | FLOAT | |
| `best_bid` | FLOAT | |
| `best_ask` | FLOAT | |
| `spread` | FLOAT | |
| `one_day_price_change` | FLOAT | |
| `one_week_price_change` | FLOAT | |
| `active` | BOOLEAN | |
| `closed` | BOOLEAN | |
| `image` | VARCHAR | |
| `icon` | VARCHAR | |
| `events` | JSONB | Nested event objects |
| `first_seen_at` | TIMESTAMPTZ | Our timestamp |
| `updated_at` | TIMESTAMPTZ | |

Index: `(active, volume_num DESC)` for default sorted listing.

### `market_snapshots` table (one row per market per poll)

| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGINT PK | Auto-increment |
| `market_id` | VARCHAR FK | -> markets.id |
| `outcome_prices` | JSONB | |
| `last_trade_price` | FLOAT | |
| `volume_num` | FLOAT | |
| `liquidity_num` | FLOAT | |
| `recorded_at` | TIMESTAMPTZ | |

Index: `(market_id, recorded_at)` for efficient history queries.

---

## 3. Backend Architecture

### 3.1 Ingestion Service (`app/services/ingestion.py`)

- Runs as `asyncio.Task` started in FastAPI's `lifespan` context manager
- Uses `httpx.AsyncClient` to paginate `?limit=100&offset=N` (up to ~500 markets)
- `INSERT ... ON CONFLICT (id) DO UPDATE` for atomic upsert
- Creates `MarketSnapshot` row for every market on every poll
- `while True` loop with `asyncio.sleep(45)` + error handling (log + continue)

### 3.2 API Endpoints

| Endpoint | Method | Query Params |
|----------|--------|-------------|
| `/markets` | GET | `limit`, `offset`, `search`, `active_only`, `sort_by`, `sort_order` |
| `/markets/{id}` | GET | -- |
| `/markets/{id}/history` | GET | `hours` (default 24) |
| `/ai/analyze` | POST | Body: `{ "market_id": "..." }` |
| `/health` | GET | -- |

### 3.3 Config (`app/config.py`)

`pydantic-settings` with `DATABASE_URL`, `OPENAI_API_KEY`, `CORS_ORIGINS`, `POLYMARKET_API_URL`, `POLL_INTERVAL_SECONDS`.

---

## 4. Frontend Architecture

### API Proxy

`next.config.ts` rewrites: `/api/:path*` -> `http://backend:8000/:path*` (Docker) or `http://localhost:8000/:path*` (local).

### Pages

- **Dashboard** (`app/page.tsx`): Server component fetches initial data. `<MarketList>` client component uses SWR with 30s polling. Search bar (debounced), filter/sort controls, grid of `<MarketCard>`.
- **Market Detail** (`app/markets/[id]/page.tsx`): Server component fetches market. Client components for `<PriceChart>` (recharts line chart, time range selector) and `<AiInsights>` (on-demand "Analyze" button).

### Next.js 16 Notes

- `params` and `searchParams` are Promises (must await)
- Use `PageProps<'/markets/[id]'>` for typed params
- `fetch` not cached by default

---

## 5. AI Feature: Market Trend Analyzer

**Why this scores well**: Pre-computes statistics from `market_snapshots` before calling GPT. The feature depends on the historical data pipeline -- not just a prompt wrapper.

**Pipeline**:
1. Query `market_snapshots` for last 24h
2. `compute_market_stats()`: price_change, volatility (stdev of deltas), momentum (1st half vs 2nd half), direction, high/low
3. Build prompt with computed stats + market metadata
4. `gpt-4o-mini` with `response_format={"type": "json_object"}`, temperature=0.3
5. Parse into Pydantic `AiAnalysisResponse`: `trend` (bullish/bearish/stable/volatile), `confidence` (0-1), `summary` (string), `key_observations` (list[str])

**Frontend**: Trend badge (color-coded), confidence bar, summary text, observations list.

---

## 6. Docker Setup

### docker-compose.yml

- **db**: `postgres:16-alpine`, port 5432, healthcheck, named volume
- **backend**: Build `./backend`, port 8000, depends on db health, command: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`
- **frontend**: Build `./frontend/predictq`, port 3000, depends on backend

### Environment Variables

```
DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/predictq
OPENAI_API_KEY=sk-...
CORS_ORIGINS=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 7. Test Suite (pytest)

### Strategy

Tests run against a real PostgreSQL instance (Docker) — no SQLite substitutes. The ingestion service and OpenAI calls are mocked at the HTTP boundary so tests are fast and deterministic.

### Dependencies (`requirements-dev.txt`)

```
-r requirements.txt
pytest==8.3.5
pytest-asyncio==0.26.0
httpx==0.28.1
aiosqlite==0.21.0
```

Note: `httpx` is already a project dependency and provides `AsyncClient` for FastAPI's `TestClient` equivalent via `transport=ASGITransport`.

### Fixtures (`tests/conftest.py`)

| Fixture | Scope | Purpose |
|---------|-------|---------|
| `engine` | session | Creates async engine pointing to test DB (`predictq_test`), runs `Base.metadata.create_all`, drops all after |
| `db_session` | function | Provides a transactional `AsyncSession`, rolls back after each test |
| `client` | function | `httpx.AsyncClient` with `ASGITransport(app)`, overrides `get_session` dependency |
| `sample_market_data` | function | Returns a dict matching the Polymarket API response shape |
| `seeded_db` | function | Inserts a `Market` + several `MarketSnapshot` rows into the test DB |

### Test Modules

#### `test_models.py` — Schema & Model Validation
- Market model accepts valid Polymarket data and maps fields correctly
- MarketSnapshot records link to parent market via `market_id`
- Pydantic schemas serialize/deserialize correctly (outcomes as JSONB, float coercions)
- `updated_at` auto-updates on upsert

#### `test_ingestion.py` — Ingestion Service (Mocked HTTP)
- Parses paginated Polymarket API response correctly
- Upserts new markets (INSERT path)
- Upserts existing markets (UPDATE path — verifies `updated_at` changes, `first_seen_at` stays)
- Creates a `MarketSnapshot` row for each market per poll
- Handles API errors gracefully (logs, does not crash)
- Handles malformed/partial market data (missing optional fields)

#### `test_markets_api.py` — Market Endpoints (Integration)
- `GET /markets` returns paginated list with correct default sort (volume desc)
- `GET /markets?search=<term>` filters by question text (case-insensitive)
- `GET /markets?active_only=true` excludes closed markets
- `GET /markets?sort_by=volume_24hr&sort_order=asc` respects sort params
- `GET /markets/{id}` returns a single market with all fields
- `GET /markets/{id}` returns 404 for non-existent ID
- `GET /markets/{id}/history` returns snapshots ordered by `recorded_at`
- `GET /markets/{id}/history?hours=1` filters snapshots to last hour
- `GET /health` returns 200

#### `test_ai_analysis.py` — AI Analysis (Mocked OpenAI)
- `compute_market_stats()` correctly calculates volatility, momentum, direction from snapshot series
- `compute_market_stats()` returns graceful default when <2 snapshots
- Full `/ai/analyze` endpoint returns structured response with mocked OpenAI (patch `openai.AsyncOpenAI`)
- Returns 404 when market_id doesn't exist
- Returns meaningful response when insufficient history data

### Running Tests

```bash
# Start test database
docker compose up db -d

# Create test database
docker exec -it predictq-db-1 psql -U postgres -c "CREATE DATABASE predictq_test;"

# Run tests
cd backend
source .venv/bin/activate
pytest -v
```

Or with Docker Compose (CI-friendly):
```bash
docker compose run --rm backend pytest -v
```

---

## 8. README

The README at the project root will include the following sections:

### Structure

```markdown
# PredictQ — Market Intelligence Dashboard

> Real-time Polymarket prediction market dashboard with AI-powered trend analysis.

## Overview
Brief description: full-stack app that polls Polymarket, stores historical data, 
exposes a REST API, and surfaces it through an interactive Next.js dashboard.

## Architecture
Diagram showing: Polymarket API → Ingestion Service → PostgreSQL → FastAPI → Next.js Frontend
                                                                 → OpenAI (AI Analysis)

## Tech Stack
Table listing: FastAPI, PostgreSQL, SQLAlchemy+Alembic, Next.js 16, OpenAI, Docker

## Features
- Real-time market data ingestion (45s polling interval)
- Historical price tracking with time-series snapshots
- Searchable, filterable, sortable market dashboard
- Interactive price history charts (Recharts)
- AI-powered market trend analysis (volatility, momentum, direction)

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- Python 3.12+
- OpenAI API key

### Quick Start (Docker)
1. Clone the repo
2. Copy .env.example to .env, add OPENAI_API_KEY
3. docker compose up
4. Open http://localhost:3000

### Local Development (without Docker)
Step-by-step for running Postgres, backend, and frontend separately.

## API Reference
Table of endpoints: GET /markets, GET /markets/{id}, GET /markets/{id}/history, 
POST /ai/analyze, GET /health — with query params and example responses.

## Database Schema
Brief description of markets and market_snapshots tables with the historical tracking rationale.

## AI Feature: Market Trend Analyzer
How it works: pre-computes stats from snapshots → builds prompt → GPT-4o-mini → structured JSON.
Why it's not a prompt wrapper.

## Testing
How to run the test suite. What's covered.

## Deployment (Railway)
Step-by-step Railway deployment guide.

## Design Decisions & Tradeoffs
- In-process asyncio ingestion vs. Celery (simplicity, no extra infra)
- Async SQLAlchemy (shared event loop with API)
- SWR over React Query (lighter for read-heavy dashboard)
- next.config.ts rewrites (eliminates CORS)
- JSONB for outcomes (avoids join table, markets have variable outcome counts)

## What I'd Do With More Time
- WebSocket/SSE for real-time pushes
- More AI features (cross-market correlation, portfolio builder)
- Redis caching layer
- Comprehensive test coverage
- Rate limiting & request throttling
- User accounts & watchlists
```

---

## 9. Implementation Order

| # | Phase | What to Build | Commit Message |
|---|-------|---------------|----------------|
| 1 | Scaffolding | docker-compose.yml (Postgres only), requirements.txt, app/config.py, app/database.py, app/models.py, .gitignore | `feat: project scaffolding with Postgres and SQLAlchemy models` |
| 2 | Migrations | alembic init, env.py (async), autogenerate migration, run upgrade | `feat: Alembic migrations for markets and snapshots tables` |
| 3 | Ingestion | app/services/ingestion.py, integrate into app/main.py lifespan | `feat: Polymarket ingestion service with polling and upsert` |
| 4 | API | app/schemas.py, app/routes/markets.py, wire into main.py | `feat: REST API endpoints for markets, detail, and history` |
| 5 | Backend tests | conftest.py, test_models.py, test_ingestion.py, test_markets_api.py | `test: add pytest suite for models, ingestion, and API endpoints` |
| 6 | Frontend setup | next.config.ts rewrites, lib/types.ts, lib/api.ts, install swr+recharts | `feat: frontend API client and type definitions` |
| 7 | Dashboard | layout.tsx, page.tsx, MarketList, MarketCard, SearchBar, FilterControls | `feat: market dashboard with search, filter, and sort` |
| 8 | Detail page | markets/[id]/page.tsx, PriceChart component | `feat: market detail page with price history chart` |
| 9 | AI backend | app/services/ai_analysis.py, app/routes/ai.py | `feat: AI-powered market trend analysis with OpenAI` |
| 10 | AI tests | test_ai_analysis.py | `test: add AI analysis tests with mocked OpenAI` |
| 11 | AI frontend | AiInsights component on detail page | `feat: AI insights panel on market detail page` |
| 12 | Docker | Backend + Frontend Dockerfiles, full docker-compose.yml | `feat: Docker Compose for full-stack local dev` |
| 13 | Deploy + README | Railway config, comprehensive README.md | `docs: add README with architecture, setup, API reference, and design decisions` |

---

## 10. Verification

### Automated (test suite)
```bash
cd backend && source .venv/bin/activate && pytest -v
```
All tests should pass: model validation, ingestion (mocked HTTP), API endpoints (real DB), AI analysis (mocked OpenAI).

### Manual (end-to-end)
1. `docker compose up` -- all 3 services start, migrations run
2. Wait 45s, check `GET http://localhost:8000/markets` returns data
3. `GET /markets/{id}` returns a single market
4. `GET /markets/{id}/history` returns snapshot array
5. Frontend at `http://localhost:3000` shows market cards
6. Search/filter/sort work in the UI
7. Click a market -> detail page with price chart
8. Click "Analyze" -> AI insights appear
9. `POST /ai/analyze` returns structured trend analysis
