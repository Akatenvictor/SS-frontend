/**
 * Secondary-market price history maths (issue #413)
 *
 * Pure helpers for the price history chart on a secondary market listing
 * detail page, kept free of React (and of recharts) so the range filtering
 * and "is there enough history to bother charting" rules can be tested
 * directly — matching the pattern already used for the listings grid's
 * filtering/yield maths in lib/secondaryMarket.ts.
 */

import type { InvoicePriceHistoryPoint } from "@/lib/api";

export const PRICE_HISTORY_RANGES = ["7d", "30d", "all"] as const;
export type PriceHistoryRange = (typeof PRICE_HISTORY_RANGES)[number];

export const PRICE_HISTORY_RANGE_LABELS: Record<PriceHistoryRange, string> = {
  "7d": "7D",
  "30d": "30D",
  all: "All time",
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * A chart needs at least 3 historical listings' worth of ask prices to show
 * a meaningful trend rather than a line between two arbitrary points — below
 * that, the chart is hidden entirely regardless of which time range is
 * selected (issue #413's acceptance criteria).
 */
export const MIN_HISTORY_POINTS_TO_CHART = 3;

export function shouldShowPriceHistoryChart(
  history: InvoicePriceHistoryPoint[]
): boolean {
  return history.length >= MIN_HISTORY_POINTS_TO_CHART;
}

/**
 * Narrows `history` to the selected time range. "all" returns every point,
 * sorted oldest-first so the chart reads left-to-right chronologically —
 * points are not assumed to already arrive in order from the API.
 */
export function filterHistoryByRange(
  history: InvoicePriceHistoryPoint[],
  range: PriceHistoryRange,
  now: number = Date.now()
): InvoicePriceHistoryPoint[] {
  const sorted = [...history].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  if (range === "all") return sorted;

  const windowDays = range === "7d" ? 7 : 30;
  const cutoff = now - windowDays * MS_PER_DAY;

  return sorted.filter((point) => {
    const t = new Date(point.date).getTime();
    return Number.isFinite(t) && t >= cutoff;
  });
}

/**
 * The most recent historical point, used to position the "current ask
 * price" marker. Falls back to null for an empty range so the chart can
 * skip rendering the marker rather than pointing at nothing.
 */
export function latestHistoryPoint(
  history: InvoicePriceHistoryPoint[]
): InvoicePriceHistoryPoint | null {
  if (history.length === 0) return null;
  return history.reduce((latest, point) =>
    new Date(point.date).getTime() > new Date(latest.date).getTime() ? point : latest
  );
}
