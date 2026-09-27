import { describe, it, expect } from "vitest";

import {
  EMPTY_SECONDARY_MARKET_FILTERS,
  daysUntil,
  filterListings,
  hasActiveFilters,
  impliedYieldPercent,
  isSoldOut,
  listingImpliedYield,
  totalCost,
  type SecondaryMarketFilters,
} from "@/lib/secondaryMarket";
import type { ResaleListing } from "@/lib/api";

const NOW = new Date("2026-06-01T00:00:00Z").getTime();
const DAY = 24 * 60 * 60 * 1000;

function listing(overrides: Partial<ResaleListing> = {}): ResaleListing {
  return {
    id: "l-1",
    invoice_id: "inv-1",
    invoice_title: "Acme trade receivable",
    invoice_type: "trade_receivable",
    seller: "GSELLER",
    quantity: 100,
    remaining_quantity: 100,
    ask_price: 100,
    maturity_value: 110,
    maturity_date: new Date(NOW + 365 * DAY).toISOString(),
    listed_at: "2026-05-01T00:00:00Z",
    status: "active",
    ...overrides,
  };
}

function filters(overrides: Partial<SecondaryMarketFilters> = {}): SecondaryMarketFilters {
  return { ...EMPTY_SECONDARY_MARKET_FILTERS, ...overrides };
}

describe("daysUntil", () => {
  it("counts whole days forward", () => {
    expect(daysUntil(new Date(NOW + 10 * DAY).toISOString(), NOW)).toBe(10);
  });

  it("rounds a partial day up so a closing invoice is not shown as past", () => {
    expect(daysUntil(new Date(NOW + DAY / 2).toISOString(), NOW)).toBe(1);
  });

  it("returns a negative count for a past date", () => {
    expect(daysUntil(new Date(NOW - 5 * DAY).toISOString(), NOW)).toBe(-5);
  });

  it("returns Infinity for an unparseable date", () => {
    expect(daysUntil("not-a-date", NOW)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("impliedYieldPercent", () => {
  it("annualises the return over the remaining term", () => {
    // Buy at 100, receive 110 in 365 days -> 10% over a year.
    const maturity = new Date(NOW + 365 * DAY).toISOString();
    expect(impliedYieldPercent(100, 110, maturity, NOW)).toBeCloseTo(10, 5);
  });

  it("scales a shorter holding period up to an annual figure", () => {
    // Buy at 100, receive 110 in ~183 days -> ~20% annualised.
    const maturity = new Date(NOW + 182.5 * DAY).toISOString();
    expect(impliedYieldPercent(100, 110, maturity, NOW)).toBeCloseTo(20, 0);
  });

  it("returns 0 rather than a negative yield when bought at maturity value", () => {
    const maturity = new Date(NOW + 100 * DAY).toISOString();
    expect(impliedYieldPercent(110, 110, maturity, NOW)).toBe(0);
    expect(impliedYieldPercent(120, 110, maturity, NOW)).toBe(0);
  });

  it("returns 0 for a zero ask price, which would otherwise divide by zero", () => {
    const maturity = new Date(NOW + 100 * DAY).toISOString();
    expect(impliedYieldPercent(0, 110, maturity, NOW)).toBe(0);
  });

  it("returns 0 once the invoice has matured", () => {
    const maturity = new Date(NOW - DAY).toISOString();
    expect(impliedYieldPercent(100, 110, maturity, NOW)).toBe(0);
  });

  it("reads the fields off a listing", () => {
    const maturity = new Date(NOW + 365 * DAY).toISOString();
    expect(listingImpliedYield(listing({ ask_price: 100, maturity_value: 110, maturity_date: maturity }), NOW)).toBeCloseTo(10, 5);
  });
});

describe("totalCost", () => {
  it("multiplies price by quantity for any quantity", () => {
    expect(totalCost(100, 1)).toBe(100);
    expect(totalCost(100, 7)).toBe(700);
    expect(totalCost(12.5, 3)).toBe(37.5);
    expect(totalCost(100, 0)).toBe(0);
  });
});

describe("isSoldOut", () => {
  it("treats a zero balance or a sold status as sold out", () => {
    expect(isSoldOut(listing({ remaining_quantity: 0 }))).toBe(true);
    expect(isSoldOut(listing({ status: "sold" }))).toBe(true);
    expect(isSoldOut(listing())).toBe(false);
  });
});

describe("hasActiveFilters", () => {
  it("is false for the empty filter set", () => {
    expect(hasActiveFilters(EMPTY_SECONDARY_MARKET_FILTERS)).toBe(false);
  });

  it("is true as soon as any control is set", () => {
    expect(hasActiveFilters(filters({ invoiceType: "supply_chain" }))).toBe(true);
    expect(hasActiveFilters(filters({ minYield: 5 }))).toBe(true);
    expect(hasActiveFilters(filters({ maxPrice: 500 }))).toBe(true);
    expect(hasActiveFilters(filters({ maxDaysToMaturity: 30 }))).toBe(true);
  });
});

describe("filterListings", () => {
  const listings = [
    listing({ id: "cheap-short", ask_price: 80, maturity_value: 110, maturity_date: new Date(NOW + 100 * DAY).toISOString() }),
    listing({ id: "dear-long", ask_price: 120, maturity_value: 130, maturity_date: new Date(NOW + 300 * DAY).toISOString() }),
    listing({ id: "supply", invoice_type: "supply_chain" }),
    listing({ id: "sold", status: "sold" }),
    listing({ id: "empty", remaining_quantity: 0 }),
    listing({ id: "cancelled", status: "cancelled" }),
  ];

  it("returns only active, in-stock listings when unfiltered", () => {
    const ids = filterListings(listings, EMPTY_SECONDARY_MARKET_FILTERS, NOW).map((l) => l.id);
    expect(ids).toEqual(["cheap-short", "dear-long", "supply"]);
  });

  it("filters by invoice type", () => {
    const ids = filterListings(listings, filters({ invoiceType: "supply_chain" }), NOW).map((l) => l.id);
    expect(ids).toEqual(["supply"]);
  });

  it("filters by a price band", () => {
    expect(
      filterListings(listings, filters({ minPrice: 100 }), NOW).map((l) => l.id)
    ).toEqual(["dear-long", "supply"]);
    expect(
      filterListings(listings, filters({ maxPrice: 100 }), NOW).map((l) => l.id)
    ).toEqual(["cheap-short", "supply"]);
    // 80 and 120 both fall outside 90-110, leaving only the 100-priced listing.
    expect(
      filterListings(listings, filters({ minPrice: 90, maxPrice: 110 }), NOW).map((l) => l.id)
    ).toEqual(["supply"]);
  });

  it("filters by an implied-yield band", () => {
    // cheap-short: 100d for 37.5% -> ~137% annualised. dear-long: 300d for
    // 8.33% -> ~10% annualised. supply: ~10% annualised.
    expect(filterListings(listings, filters({ minYield: 50 }), NOW).map((l) => l.id)).toEqual([
      "cheap-short",
    ]);
    expect(filterListings(listings, filters({ maxYield: 50 }), NOW).map((l) => l.id)).toEqual([
      "dear-long",
      "supply",
    ]);
  });

  it("filters by days to maturity", () => {
    // cheap-short matures in 100d; the others are 300d or 365d out.
    const ids = filterListings(listings, filters({ maxDaysToMaturity: 150 }), NOW).map((l) => l.id);
    expect(ids).toEqual(["cheap-short"]);
  });

  it("combines filters", () => {
    const ids = filterListings(
      listings,
      filters({ invoiceType: "trade_receivable", minPrice: 70, maxDaysToMaturity: 200 }),
      NOW
    ).map((l) => l.id);
    expect(ids).toEqual(["cheap-short"]);
  });

  it("returns nothing when no listing matches", () => {
    expect(filterListings(listings, filters({ invoiceType: "promissory_note" }), NOW)).toEqual([]);
  });
});
