"use client";

import { useState } from "react";

import { analyzeMarket } from "@/lib/api";
import type { AiAnalysisResponse } from "@/lib/types";

interface AiInsightsProps {
  marketId: string;
}

const TREND_STYLES: Record<string, { label: string; className: string }> = {
  bullish: {
    label: "Bullish",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  bearish: {
    label: "Bearish",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
  stable: {
    label: "Stable",
    className: "border-slate-200 bg-slate-50 text-slate-700",
  },
  volatile: {
    label: "Volatile",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  unknown: {
    label: "Unknown",
    className: "border-slate-200 bg-slate-100 text-slate-500",
  },
};

function getTrendStyle(trend: string) {
  return TREND_STYLES[trend] ?? TREND_STYLES.unknown;
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const percent = Math.round(confidence * 100);
  const barColor =
    confidence >= 0.7
      ? "bg-emerald-500"
      : confidence >= 0.4
        ? "bg-amber-500"
        : "bg-slate-400";

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-500">Confidence</span>
        <span className="font-semibold text-slate-700">{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.max(percent, 4)}%` }}
        />
      </div>
    </div>
  );
}

export function AiInsights({ marketId }: AiInsightsProps) {
  const [analysis, setAnalysis] = useState<AiAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeMarket(marketId);
      setAnalysis(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Analysis request failed. Check that the backend is running.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-[1.75rem] border border-white/60 bg-white/80 p-5 shadow-[0_22px_48px_-36px_rgba(15,35,51,0.65)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
            AI trend analysis
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Powered by GPT-4o-mini with pre-computed statistics
          </p>
        </div>
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={loading}
          className="rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Analyzing
            </span>
          ) : analysis ? (
            "Re-analyze"
          ) : (
            "Analyze"
          )}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {analysis && (
        <div className="mt-5 space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            {(() => {
              const style = getTrendStyle(analysis.trend);
              return (
                <span
                  className={`rounded-full border px-4 py-1.5 text-sm font-semibold uppercase tracking-[0.16em] ${style.className}`}
                >
                  {style.label}
                </span>
              );
            })()}
            <ConfidenceBar confidence={analysis.confidence} />
          </div>

          <p className="text-sm leading-7 text-slate-700">{analysis.summary}</p>

          {analysis.key_observations.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Key observations
              </p>
              <ul className="space-y-2">
                {analysis.key_observations.map((observation, index) => (
                  <li
                    key={`obs-${index}`}
                    className="flex gap-2.5 text-sm text-slate-600"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-teal-500" />
                    {observation}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.stats && !analysis.stats.insufficient_data && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-[1.25rem] border border-slate-200/80 bg-slate-50/90 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Data points
                </p>
                <p className="mt-1 text-base font-semibold text-slate-900">
                  {analysis.stats.data_points}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-slate-200/80 bg-slate-50/90 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Volatility
                </p>
                <p className="mt-1 text-base font-semibold text-slate-900">
                  {analysis.stats.volatility !== null
                    ? analysis.stats.volatility.toFixed(4)
                    : "N/A"}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-slate-200/80 bg-slate-50/90 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Momentum
                </p>
                <p className="mt-1 text-base font-semibold text-slate-900">
                  {analysis.stats.momentum !== null
                    ? analysis.stats.momentum.toFixed(4)
                    : "N/A"}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-slate-200/80 bg-slate-50/90 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Range
                </p>
                <p className="mt-1 text-base font-semibold text-slate-900">
                  {analysis.stats.low !== null && analysis.stats.high !== null
                    ? `${(analysis.stats.low * 100).toFixed(1)}–${(analysis.stats.high * 100).toFixed(1)}%`
                    : "N/A"}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
