import { describe, it, expect } from "vitest";

import {
  MIN_HISTORY_POINTS_TO_CHART,
  filterHistoryByRange,
  latestHistoryPoint,
  shouldShowPriceHistoryChart,
} from "@/lib/priceHistory";
import type { InvoicePriceHistoryPoint } from "@/lib/api";

const NOW = new Date("2026-06-30T00:00:00Z").getTime();
const DAY = 24 * 60 * 60 * 1000;

function point(daysAgo: number, price: number, quantity = 10): InvoicePriceHistoryPoint {
  return {
    date: new Date(NOW - daysAgo * DAY).toISOString(),
    price,
    quantity,
  };
}

describe("shouldShowPriceHistoryChart", () => {
  it("is false below the minimum history threshold", () => {
    expect(shouldShowPriceHistoryChart([])).toBe(false);
    expect(shouldShowPriceHistoryChart([point(1, 100)])).toBe(false);
    expect(
      shouldShowPriceHistoryChart([point(1, 100), point(2, 101)])
    ).toBe(false);
  });

  it("is true at and above the minimum history threshold", () => {
    const history = Array.from({ length: MIN_HISTORY_POINTS_TO_CHART }, (_, i) =>
      point(i, 100 + i)
    );
    expect(shouldShowPriceHistoryChart(history)).toBe(true);
    expect(shouldShowPriceHistoryChart([...history, point(10, 99)])).toBe(true);
  });
});

describe("filterHistoryByRange", () => {
  const history = [
    point(1, 105), // within 7d and 30d
    point(6, 104), // within 7d and 30d
    point(15, 103), // within 30d only
    point(29, 102), // within 30d only
    point(90, 101), // outside both — "all" only
  ];

  it("returns every point, sorted oldest-first, for 'all'", () => {
    const result = filterHistoryByRange(history, "all", NOW);
    expect(result).toHaveLength(5);
    expect(result[0].price).toBe(101); // oldest (90 days ago)
    expect(result[result.length - 1].price).toBe(105); // newest (1 day ago)
  });

  it("keeps only points within the last 7 days for '7d'", () => {
    const result = filterHistoryByRange(history, "7d", NOW);
    expect(result.map((p) => p.price)).toEqual([104, 105]);
  });

  it("keeps only points within the last 30 days for '30d'", () => {
    const result = filterHistoryByRange(history, "30d", NOW);
    expect(result.map((p) => p.price)).toEqual([102, 103, 104, 105]);
  });

  it("returns an empty array when nothing falls in the range", () => {
    const result = filterHistoryByRange([point(90, 101)], "7d", NOW);
    expect(result).toEqual([]);
  });

  it("does not mutate the input array", () => {
    const original = [point(5, 100), point(1, 101)];
    const copy = [...original];
    filterHistoryByRange(original, "all", NOW);
    expect(original).toEqual(copy);
  });
});

describe("latestHistoryPoint", () => {
  it("returns null for an empty history", () => {
    expect(latestHistoryPoint([])).toBeNull();
  });

  it("returns the most recent point regardless of input order", () => {
    const history = [point(10, 100), point(1, 105), point(20, 98)];
    expect(latestHistoryPoint(history)?.price).toBe(105);
  });
});
