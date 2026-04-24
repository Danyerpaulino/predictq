import type { JsonCollection, Market } from "@/lib/types";

interface OutcomeDisplay {
  label: string;
  price: number | null;
  probability: number | null;
}

const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function asArray(collection: JsonCollection): unknown[] {
  return Array.isArray(collection) ? collection : [];
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function getOutcomePairs(market: Market): OutcomeDisplay[] {
  const labels = asArray(market.outcomes).map((value) => String(value));
  const prices = asArray(market.outcome_prices).map(toNumber);

  return labels
    .map((label, index) => {
      const price = prices[index] ?? null;

      return {
        label,
        price,
        probability: price === null ? null : price * 100,
      };
    })
    .filter((outcome) => outcome.label.length > 0);
}

export function formatCompactCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "N/A";
  }

  return compactCurrencyFormatter.format(value);
}

export function formatProbability(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "N/A";
  }

  return `${(value * 100).toFixed(value >= 0.1 ? 1 : 2)}%`;
}

export function formatSignedPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "N/A";
  }

  const percent = (value * 100).toFixed(1);
  return `${value >= 0 ? "+" : ""}${percent}%`;
}

export function formatDateLabel(value: string | null | undefined): string {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return "N/A";
  }

  return dateFormatter.format(date);
}
