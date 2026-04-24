export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonCollection = JsonValue[] | Record<string, JsonValue> | null;

export type MarketSortField =
  | "volume_num"
  | "liquidity_num"
  | "volume_24hr"
  | "last_trade_price"
  | "updated_at"
  | "end_date";

export type SortOrder = "asc" | "desc";

export interface Market {
  id: string;
  question: string;
  slug: string | null;
  description: string | null;
  condition_id: string | null;
  outcomes: JsonCollection;
  outcome_prices: JsonCollection;
  clob_token_ids: JsonCollection;
  start_date: string | null;
  end_date: string | null;
  volume_num: number | null;
  liquidity_num: number | null;
  volume_24hr: number | null;
  last_trade_price: number | null;
  best_bid: number | null;
  best_ask: number | null;
  spread: number | null;
  one_day_price_change: number | null;
  one_week_price_change: number | null;
  active: boolean;
  closed: boolean;
  image: string | null;
  icon: string | null;
  events: JsonCollection;
  first_seen_at: string;
  updated_at: string;
}

export interface MarketSnapshot {
  id: number;
  market_id: string;
  outcome_prices: JsonCollection;
  last_trade_price: number | null;
  volume_num: number | null;
  liquidity_num: number | null;
  recorded_at: string;
}

export interface MarketsListResponse {
  items: Market[];
  total: number;
  limit: number;
  offset: number;
}

export interface MarketHistoryResponse {
  market_id: string;
  hours: number;
  snapshots: MarketSnapshot[];
}

export interface AiAnalysisResponse {
  market_id: string;
  trend: "bullish" | "bearish" | "stable" | "volatile" | "unknown";
  confidence: number;
  summary: string;
  key_observations: string[];
  stats: {
    data_points: number;
    insufficient_data: boolean;
    price_change: number | null;
    volatility: number | null;
    momentum: number | null;
    direction: string;
    high: number | null;
    low: number | null;
  };
}

export interface GetMarketsParams {
  limit?: number;
  offset?: number;
  search?: string;
  active_only?: boolean;
  sort_by?: MarketSortField;
  sort_order?: SortOrder;
}
