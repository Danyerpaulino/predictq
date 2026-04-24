import type {
  AiAnalysisResponse,
  GetMarketsParams,
  Market,
  MarketHistoryResponse,
  MarketsListResponse,
} from "@/lib/types";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, "");
}

function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return "/api";
  }

  const serverBaseUrl =
    process.env.API_URL ??
    process.env.API_PROXY_TARGET ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:8000";

  return trimTrailingSlash(serverBaseUrl);
}

function buildQueryString(
  params: Record<string, string | number | boolean | undefined>,
): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }

    searchParams.set(key, String(value));
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed for ${path}: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function getMarkets(
  params: GetMarketsParams = {},
): Promise<MarketsListResponse> {
  return apiFetch<MarketsListResponse>(
    `/markets${buildQueryString({
      limit: params.limit,
      offset: params.offset,
      search: params.search,
      active_only: params.active_only,
      sort_by: params.sort_by,
      sort_order: params.sort_order,
    })}`,
  );
}

export async function getMarket(marketId: string): Promise<Market> {
  return apiFetch<Market>(`/markets/${marketId}`);
}

export async function getMarketHistory(
  marketId: string,
  hours = 24,
): Promise<MarketHistoryResponse> {
  return apiFetch<MarketHistoryResponse>(
    `/markets/${marketId}/history${buildQueryString({ hours })}`,
  );
}

export async function analyzeMarket(
  marketId: string,
): Promise<AiAnalysisResponse> {
  return apiFetch<AiAnalysisResponse>("/ai/analyze", {
    method: "POST",
    body: JSON.stringify({ market_id: marketId }),
  });
}
