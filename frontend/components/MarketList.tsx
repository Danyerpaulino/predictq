"use client";

import { startTransition, useEffect, useEffectEvent, useState } from "react";
import useSWR from "swr";

import { getMarkets } from "@/lib/api";
import { FilterControls } from "@/components/FilterControls";
import { MarketCard } from "@/components/MarketCard";
import { SearchBar } from "@/components/SearchBar";
import type { MarketSortField, MarketsListResponse, SortOrder } from "@/lib/types";

interface MarketListProps {
  initialData: MarketsListResponse | null;
  initialError?: string | null;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 12;
const DEFAULT_SORT_BY: MarketSortField = "volume_num";
const DEFAULT_SORT_ORDER: SortOrder = "desc";

function LoadingGrid({ pageSize }: { pageSize: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {Array.from({ length: Math.min(pageSize, 6) }).map((_, index) => (
        <div
          key={`loading-card-${index}`}
          className="rounded-[1.75rem] border border-white/70 bg-white/80 p-5 shadow-sm"
        >
          <div className="animate-pulse space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-6 w-20 rounded-full bg-slate-200" />
              <div className="h-4 w-24 rounded-full bg-slate-100" />
            </div>
            <div className="h-8 rounded-[1rem] bg-slate-200" />
            <div className="h-16 rounded-[1rem] bg-slate-100" />
            <div className="space-y-3">
              <div className="h-8 rounded-full bg-slate-100" />
              <div className="h-8 rounded-full bg-slate-100" />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="h-20 rounded-[1rem] bg-slate-100" />
              <div className="h-20 rounded-[1rem] bg-slate-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MarketList({
  initialData,
  initialError,
  pageSize = DEFAULT_PAGE_SIZE,
}: MarketListProps) {
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [sortBy, setSortBy] = useState<MarketSortField>(DEFAULT_SORT_BY);
  const [sortOrder, setSortOrder] = useState<SortOrder>(DEFAULT_SORT_ORDER);

  const syncSearch = useEffectEvent((value: string) => {
    startTransition(() => {
      setSearchTerm(value.trim());
      setPage(0);
    });
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => syncSearch(searchInput), 300);
    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const offset = page * pageSize;
  const isDefaultState =
    page === 0 &&
    searchTerm.length === 0 &&
    activeOnly &&
    sortBy === DEFAULT_SORT_BY &&
    sortOrder === DEFAULT_SORT_ORDER;

  const swrKey = [
    "markets",
    pageSize,
    offset,
    searchTerm,
    activeOnly ? "active" : "all",
    sortBy,
    sortOrder,
  ] as const;

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    swrKey,
    () =>
      getMarkets({
        limit: pageSize,
        offset,
        search: searchTerm || undefined,
        active_only: activeOnly,
        sort_by: sortBy,
        sort_order: sortOrder,
      }),
    {
      fallbackData: isDefaultState ? initialData ?? undefined : undefined,
      keepPreviousData: true,
      refreshInterval: 30_000,
      revalidateOnFocus: false,
    },
  );

  const markets = data?.items ?? [];
  const total = data?.total ?? (isDefaultState ? initialData?.total ?? 0 : 0);
  const showLoadingGrid = isLoading && !data;
  const showEmptyState = !showLoadingGrid && !error && markets.length === 0;
  const hasPreviousPage = page > 0;
  const hasNextPage = offset + markets.length < total;
  const rangeStart = total === 0 ? 0 : offset + 1;
  const rangeEnd = offset + markets.length;

  return (
    <div className="space-y-5">
      <section className="rounded-[1.75rem] border border-white/60 bg-white/72 p-5 shadow-[0_24px_60px_-48px_rgba(15,35,51,0.6)] backdrop-blur-xl sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              Live market scanner
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Search, filter, and sort without leaving the dashboard.
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
              Results are hydrated from the server render, then revalidated on a
              30-second loop with SWR so the market list stays current while you
              interact with the controls.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full border border-slate-200/80 bg-white px-3 py-1.5 text-slate-600 shadow-sm">
              {isValidating ? "Refreshing live snapshot" : "Live polling every 30s"}
            </span>
            {searchTerm ? (
              <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-orange-700">
                Search: &quot;{searchTerm}&quot;
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <SearchBar value={searchInput} onChange={setSearchInput} />
          <FilterControls
            activeOnly={activeOnly}
            onActiveOnlyChange={(value) => {
              startTransition(() => {
                setActiveOnly(value);
                setPage(0);
              });
            }}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortByChange={(value) => {
              startTransition(() => {
                setSortBy(value);
                setPage(0);
              });
            }}
            onSortOrderChange={(value) => {
              startTransition(() => {
                setSortOrder(value);
                setPage(0);
              });
            }}
          />
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700">
            {total > 0
              ? `Showing ${rangeStart}-${rangeEnd} of ${total.toLocaleString()} markets`
              : "No markets matched the current filters"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Page {page + 1}
            {searchTerm ? " with debounced search enabled." : "."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!hasPreviousPage}
            onClick={() => startTransition(() => setPage((current) => current - 1))}
            className="rounded-full border border-slate-200/80 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={!hasNextPage}
            onClick={() => startTransition(() => setPage((current) => current + 1))}
            className="rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300"
          >
            Next
          </button>
        </div>
      </div>

      {initialError && !initialData && !error && showLoadingGrid ? (
        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {initialError}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
          <p className="font-medium">The markets request failed.</p>
          <p className="mt-2">
            The existing dashboard data is preserved when possible. Trigger a
            manual retry when the backend is ready again.
          </p>
          <button
            type="button"
            onClick={() => {
              void mutate();
            }}
            className="mt-4 rounded-full border border-rose-300 bg-white px-4 py-2 font-medium text-rose-700 transition hover:border-rose-400"
          >
            Retry request
          </button>
        </div>
      ) : null}

      {showLoadingGrid ? <LoadingGrid pageSize={pageSize} /> : null}

      {showEmptyState ? (
        <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/65 p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-900">
            No markets matched the current view.
          </p>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            Try broadening the search term, switching the sort order, or
            including inactive markets.
          </p>
        </div>
      ) : null}

      {markets.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {markets.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
