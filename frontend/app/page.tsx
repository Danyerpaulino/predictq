import { MarketList } from "@/components/MarketList";
import { getMarkets } from "@/lib/api";
import {
  formatCompactCurrency,
  formatSignedPercent,
} from "@/lib/market-display";
import type { Market, MarketsListResponse } from "@/lib/types";

const INITIAL_LIMIT = 12;

export const dynamic = "force-dynamic";

function buildDashboardSummary(data: MarketsListResponse | null): {
  activeCount: number;
  visibleVolume24h: number | null;
  visibleLiquidity: number | null;
  biggestMoveMarket: Market | null;
} {
  if (!data) {
    return {
      activeCount: 0,
      visibleVolume24h: null,
      visibleLiquidity: null,
      biggestMoveMarket: null,
    };
  }

  let visibleVolume24h = 0;
  let visibleLiquidity = 0;
  let biggestMoveMarket: Market | null = null;
  let biggestMoveValue = -1;

  for (const market of data.items) {
    visibleVolume24h += market.volume_24hr ?? 0;
    visibleLiquidity += market.liquidity_num ?? 0;

    const absoluteMove = Math.abs(market.one_day_price_change ?? 0);
    if (absoluteMove > biggestMoveValue) {
      biggestMoveValue = absoluteMove;
      biggestMoveMarket = market;
    }
  }

  return {
    activeCount: data.total,
    visibleVolume24h,
    visibleLiquidity,
    biggestMoveMarket,
  };
}

export default async function Home() {
  let initialMarkets: MarketsListResponse | null = null;
  let initialError: string | null = null;

  try {
    initialMarkets = await getMarkets({
      limit: INITIAL_LIMIT,
      offset: 0,
      active_only: true,
      sort_by: "volume_num",
      sort_order: "desc",
    });
  } catch (error) {
    console.error("Unable to load initial markets for dashboard", error);
    initialError =
      "Live API data was unavailable during server render. Client polling will retry when the backend responds.";
  }

  const summary = buildDashboardSummary(initialMarkets);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/72 p-6 shadow-[0_28px_90px_-48px_rgba(15,35,51,0.55)] backdrop-blur-xl sm:p-8">
        <div className="absolute inset-y-0 right-0 hidden w-80 bg-[radial-gradient(circle_at_center,_rgba(201,109,56,0.16),_transparent_60%)] lg:block" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-end">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">
              Market dashboard
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Search the live market surface, then sort into the contracts with
              the most signal.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              The page hydrates with a server-fetched market slice, then keeps
              polling the `/markets` API from the client so search, filters,
              sort order, and pagination stay live without rebuilding the route.
            </p>
            {initialError ? (
              <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {initialError}
              </p>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <article className="rounded-[1.5rem] border border-slate-200/80 bg-white/88 p-4 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Active markets tracked
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">
                {summary.activeCount.toLocaleString()}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Default view scopes to live markets only.
              </p>
            </article>
            <article className="rounded-[1.5rem] border border-slate-200/80 bg-white/88 p-4 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Visible 24h volume
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">
                {formatCompactCurrency(summary.visibleVolume24h)}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Aggregate across the initial ranked slice.
              </p>
            </article>
            <article className="rounded-[1.5rem] border border-slate-200/80 bg-white/88 p-4 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Sharpest one-day move
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">
                {summary.biggestMoveMarket
                  ? formatSignedPercent(
                      summary.biggestMoveMarket.one_day_price_change,
                    )
                  : "N/A"}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {summary.biggestMoveMarket?.question ?? "Waiting for market data"}
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0">
          <MarketList
            initialData={initialMarkets}
            initialError={initialError}
            pageSize={INITIAL_LIMIT}
          />
        </div>
        <aside className="rounded-[1.75rem] border border-white/60 bg-white/72 p-6 shadow-[0_24px_60px_-48px_rgba(15,35,51,0.6)] backdrop-blur-xl">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
            Dashboard notes
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Built for the existing markets client
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            The list reuses the typed contracts from `lib/types.ts` and the
            existing `getMarkets()` helper from `lib/api.ts`, so the next phase
            can layer market detail and chart views on top of the same contract.
          </p>
          <div className="mt-6 rounded-[1.25rem] border border-slate-200/80 bg-slate-50/90 p-4">
            <p className="text-sm font-medium text-slate-700">Visible liquidity</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {formatCompactCurrency(summary.visibleLiquidity)}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              This is computed from the initial slice, not the full dataset.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
