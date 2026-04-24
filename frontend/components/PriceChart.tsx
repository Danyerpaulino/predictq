"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import useSWR from "swr";

import { getMarketHistory } from "@/lib/api";
import type { MarketSnapshot } from "@/lib/types";

interface PriceChartProps {
  marketId: string;
  initialSnapshots?: MarketSnapshot[];
}

const HOUR_OPTIONS = [1, 6, 12, 24, 48, 168] as const;

function hourLabel(hours: number): string {
  if (hours < 24) return `${hours}h`;
  if (hours === 24) return "1d";
  if (hours === 48) return "2d";
  return "7d";
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

interface ChartDataPoint {
  time: string;
  fullTime: string;
  price: number | null;
  volume: number | null;
  liquidity: number | null;
}

function transformSnapshots(snapshots: MarketSnapshot[]): ChartDataPoint[] {
  return snapshots.map((s) => ({
    time: formatTime(s.recorded_at),
    fullTime: formatDateTime(s.recorded_at),
    price: s.last_trade_price,
    volume: s.volume_num,
    liquidity: s.liquidity_num,
  }));
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm">
      <p className="text-xs font-medium text-slate-500">{data.fullTime}</p>
      {data.price !== null && (
        <p className="mt-1 text-sm font-semibold text-slate-900">
          Price: {(data.price * 100).toFixed(1)}%
        </p>
      )}
      {data.volume !== null && (
        <p className="text-sm text-slate-600">
          Volume: ${data.volume.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </p>
      )}
    </div>
  );
}

export function PriceChart({ marketId, initialSnapshots }: PriceChartProps) {
  const [hours, setHours] = useState<number>(24);

  const { data, isLoading } = useSWR(
    ["market-history", marketId, hours],
    () => getMarketHistory(marketId, hours),
    {
      fallbackData:
        hours === 24 && initialSnapshots
          ? { market_id: marketId, hours: 24, snapshots: initialSnapshots }
          : undefined,
      refreshInterval: 45_000,
      revalidateOnFocus: false,
    },
  );

  const snapshots = data?.snapshots ?? [];
  const chartData = transformSnapshots(snapshots);
  const hasData = chartData.some((d) => d.price !== null);

  return (
    <div className="rounded-[1.75rem] border border-white/60 bg-white/80 p-5 shadow-[0_22px_48px_-36px_rgba(15,35,51,0.65)] backdrop-blur-xl sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
            Price history
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {snapshots.length} snapshot{snapshots.length !== 1 ? "s" : ""} in the last {hourLabel(hours)}
          </p>
        </div>
        <div className="flex gap-1.5">
          {HOUR_OPTIONS.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setHours(h)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                hours === h
                  ? "border border-teal-700 bg-teal-700 text-white"
                  : "border border-slate-200/80 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {hourLabel(h)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 h-72">
        {isLoading && !data ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-teal-600" />
          </div>
        ) : !hasData ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-sm font-medium text-slate-500">
                No price data available for this time window
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Snapshots are recorded every 45 seconds during ingestion
              </p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0f766e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={false}
                axisLine={{ stroke: "#e2e8f0" }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                domain={["auto", "auto"]}
                width={48}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#0f766e"
                strokeWidth={2}
                fill="url(#priceGradient)"
                dot={false}
                activeDot={{ r: 4, fill: "#0f766e", stroke: "#fff", strokeWidth: 2 }}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
