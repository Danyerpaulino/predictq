import Link from "next/link";

import {
  formatCompactCurrency,
  formatDateLabel,
  formatProbability,
  formatSignedPercent,
  getOutcomePairs,
} from "@/lib/market-display";
import type { Market } from "@/lib/types";

interface MarketCardProps {
  market: Market;
}

function getStatusChip(market: Market): {
  label: string;
  className: string;
} {
  if (market.closed) {
    return {
      label: "Closed",
      className: "border-slate-300 bg-slate-100 text-slate-700",
    };
  }

  if (market.active) {
    return {
      label: "Live",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  return {
    label: "Inactive",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  };
}

function clampTextStyle(lines: number) {
  return {
    display: "-webkit-box",
    overflow: "hidden",
    WebkitBoxOrient: "vertical" as const,
    WebkitLineClamp: lines,
  };
}

export function MarketCard({ market }: MarketCardProps) {
  const outcomes = getOutcomePairs(market).slice(0, 3);
  const status = getStatusChip(market);

  return (
    <Link href={`/markets/${market.id}`} className="block">
    <article className="group overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/80 p-5 shadow-[0_22px_48px_-36px_rgba(15,35,51,0.65)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_60px_-34px_rgba(15,35,51,0.72)]">
      <div className="flex items-start justify-between gap-3">
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${status.className}`}
        >
          {status.label}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-400">
          {market.id}
        </span>
      </div>

      <h3 className="mt-4 text-xl font-semibold leading-8 tracking-tight text-slate-950">
        {market.question}
      </h3>

      <p
        className="mt-3 text-sm leading-6 text-slate-600"
        style={clampTextStyle(3)}
      >
        {market.description || market.slug || "No market description provided."}
      </p>

      <div className="mt-5 space-y-3">
        {outcomes.length > 0 ? (
          outcomes.map((outcome) => {
            const width = outcome.probability
              ? `${Math.min(Math.max(outcome.probability, 6), 100)}%`
              : "6%";

            return (
              <div key={`${market.id}-${outcome.label}`}>
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-slate-700">
                    {outcome.label}
                  </span>
                  <span className="font-semibold text-slate-950">
                    {formatProbability(outcome.price)}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#0f766e,#c96d38)]"
                    style={{ width }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-[1.1rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            Outcome pricing is not available for this market yet.
          </div>
        )}
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-[1.25rem] border border-slate-200/80 bg-slate-50/90 p-3">
          <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            24h volume
          </dt>
          <dd className="mt-2 text-base font-semibold text-slate-950">
            {formatCompactCurrency(market.volume_24hr)}
          </dd>
        </div>
        <div className="rounded-[1.25rem] border border-slate-200/80 bg-slate-50/90 p-3">
          <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Liquidity
          </dt>
          <dd className="mt-2 text-base font-semibold text-slate-950">
            {formatCompactCurrency(market.liquidity_num)}
          </dd>
        </div>
        <div className="rounded-[1.25rem] border border-slate-200/80 bg-slate-50/90 p-3">
          <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            1d move
          </dt>
          <dd className="mt-2 text-base font-semibold text-slate-950">
            {formatSignedPercent(market.one_day_price_change)}
          </dd>
        </div>
        <div className="rounded-[1.25rem] border border-slate-200/80 bg-slate-50/90 p-3">
          <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Resolution
          </dt>
          <dd className="mt-2 text-base font-semibold text-slate-950">
            {formatDateLabel(market.end_date)}
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-200/80 pt-4">
        <p className="text-sm text-slate-500">
          Updated {formatDateLabel(market.updated_at)}
        </p>
        <p className="text-sm font-medium text-slate-700">
          Spread {formatProbability(market.spread)}
        </p>
      </div>
    </article>
    </Link>
  );
}
