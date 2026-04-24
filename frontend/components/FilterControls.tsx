"use client";

import type { MarketSortField, SortOrder } from "@/lib/types";

interface FilterControlsProps {
  activeOnly: boolean;
  onActiveOnlyChange: (value: boolean) => void;
  sortBy: MarketSortField;
  sortOrder: SortOrder;
  onSortByChange: (value: MarketSortField) => void;
  onSortOrderChange: (value: SortOrder) => void;
}

const SORT_OPTIONS: Array<{ label: string; value: MarketSortField }> = [
  { label: "Volume", value: "volume_num" },
  { label: "24h volume", value: "volume_24hr" },
  { label: "Liquidity", value: "liquidity_num" },
  { label: "Last trade price", value: "last_trade_price" },
  { label: "Updated at", value: "updated_at" },
  { label: "Resolution date", value: "end_date" },
];

export function FilterControls({
  activeOnly,
  onActiveOnlyChange,
  sortBy,
  sortOrder,
  onSortByChange,
  onSortOrderChange,
}: FilterControlsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-[auto_1fr_1fr]">
      <div>
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Status
        </span>
        <button
          type="button"
          onClick={() => onActiveOnlyChange(!activeOnly)}
          className={`w-full rounded-[1.25rem] border px-4 py-3 text-sm font-medium transition ${
            activeOnly
              ? "border-teal-700 bg-teal-700 text-white shadow-sm"
              : "border-slate-200/80 bg-white text-slate-700 shadow-sm hover:border-slate-300"
          }`}
        >
          {activeOnly ? "Live markets only" : "All tracked markets"}
        </button>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Sort by
        </span>
        <select
          value={sortBy}
          onChange={(event) =>
            onSortByChange(event.target.value as MarketSortField)
          }
          className="w-full rounded-[1.25rem] border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-700">
          Direction
        </span>
        <select
          value={sortOrder}
          onChange={(event) => onSortOrderChange(event.target.value as SortOrder)}
          className="w-full rounded-[1.25rem] border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none"
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </label>
    </div>
  );
}
