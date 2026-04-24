import Link from "next/link";
import { notFound } from "next/navigation";

import { AiInsights } from "@/components/AiInsights";
import { PriceChart } from "@/components/PriceChart";
import { getMarket, getMarketHistory } from "@/lib/api";
import {
  formatCompactCurrency,
  formatDateLabel,
  formatProbability,
  formatSignedPercent,
  getOutcomePairs,
} from "@/lib/market-display";

export const dynamic = "force-dynamic";

export default async function MarketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let market;
  try {
    market = await getMarket(id);
  } catch {
    notFound();
  }

  let initialSnapshots;
  try {
    const history = await getMarketHistory(id, 24);
    initialSnapshots = history.snapshots;
  } catch {
    initialSnapshots = undefined;
  }

  const outcomes = getOutcomePairs(market);
  const statusLabel = market.closed
    ? "Closed"
    : market.active
      ? "Live"
      : "Inactive";
  const statusClass = market.closed
    ? "border-slate-300 bg-slate-100 text-slate-700"
    : market.active
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-700"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path
              fillRule="evenodd"
              d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
              clipRule="evenodd"
            />
          </svg>
          Back to dashboard
        </Link>
      </div>

      <section className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/72 p-6 shadow-[0_28px_90px_-48px_rgba(15,35,51,0.55)] backdrop-blur-xl sm:p-8">
        <div className="absolute inset-y-0 right-0 hidden w-80 bg-[radial-gradient(circle_at_center,_rgba(201,109,56,0.16),_transparent_60%)] lg:block" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${statusClass}`}
            >
              {statusLabel}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-400">
              {market.id}
            </span>
          </div>

          <h1 className="mt-5 max-w-4xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            {market.question}
          </h1>

          {market.description && (
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              {market.description}
            </p>
          )}

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-[1.25rem] border border-slate-200/80 bg-white/88 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Total volume
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {formatCompactCurrency(market.volume_num)}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-slate-200/80 bg-white/88 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                24h volume
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {formatCompactCurrency(market.volume_24hr)}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-slate-200/80 bg-white/88 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Liquidity
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {formatCompactCurrency(market.liquidity_num)}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-slate-200/80 bg-white/88 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Spread
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {formatProbability(market.spread)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-8">
          <PriceChart marketId={market.id} initialSnapshots={initialSnapshots} />
          <AiInsights marketId={market.id} />
        </div>

        <aside className="space-y-6">
          <div className="rounded-[1.75rem] border border-white/60 bg-white/80 p-5 shadow-[0_22px_48px_-36px_rgba(15,35,51,0.65)] backdrop-blur-xl">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              Outcomes
            </p>
            <div className="mt-4 space-y-4">
              {outcomes.length > 0 ? (
                outcomes.map((outcome) => {
                  const width = outcome.probability
                    ? `${Math.min(Math.max(outcome.probability, 6), 100)}%`
                    : "6%";
                  return (
                    <div key={outcome.label}>
                      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-slate-700">
                          {outcome.label}
                        </span>
                        <span className="font-semibold text-slate-950">
                          {formatProbability(outcome.price)}
                        </span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#0f766e,#c96d38)]"
                          style={{ width }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-slate-500">
                  No outcome pricing available.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/60 bg-white/80 p-5 shadow-[0_22px_48px_-36px_rgba(15,35,51,0.65)] backdrop-blur-xl">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              Market details
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Last trade</dt>
                <dd className="font-medium text-slate-900">
                  {formatProbability(market.last_trade_price)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Best bid</dt>
                <dd className="font-medium text-slate-900">
                  {formatProbability(market.best_bid)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Best ask</dt>
                <dd className="font-medium text-slate-900">
                  {formatProbability(market.best_ask)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">1-day change</dt>
                <dd className="font-medium text-slate-900">
                  {formatSignedPercent(market.one_day_price_change)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">1-week change</dt>
                <dd className="font-medium text-slate-900">
                  {formatSignedPercent(market.one_week_price_change)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Resolution</dt>
                <dd className="font-medium text-slate-900">
                  {formatDateLabel(market.end_date)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">First seen</dt>
                <dd className="font-medium text-slate-900">
                  {formatDateLabel(market.first_seen_at)}
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </main>
  );
}
