"use client";

/**
 * Secondary-market maths (issue #380)
 *
 * Pure helpers shared by the listings grid, its filter panel and the buy
 * modal. They are deliberately free of React so the pricing rules — which
 * decide what a user sees and what they are charged — can be tested directly.
 */

import { RESALE_INVOICE_TYPES, type ResaleListing } from "@/lib/api";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_YEAR = 365;

export interface SecondaryMarketFilters {
  /** `"all"` or one of `RESALE_INVOICE_TYPES`. */
  invoiceType: string;
  minYield: number;
  maxYield: number;
  minPrice: number;
  maxPrice: number;
  maxDaysToMaturity: number;
}

export const EMPTY_SECONDARY_MARKET_FILTERS: SecondaryMarketFilters = {
  invoiceType: "all",
  minYield: 0,
  maxYield: 0,
  minPrice: 0,
  maxPrice: 0,
  maxDaysToMaturity: 0,
};

export function hasActiveFilters(filters: SecondaryMarketFilters): boolean {
  return (
    filters.invoiceType !== "all" ||
    filters.minYield > 0 ||
    filters.maxYield > 0 ||
    filters.minPrice > 0 ||
    filters.maxPrice > 0 ||
    filters.maxDaysToMaturity > 0
  );
}

/** Whole days from now until `date`; negative once the date has passed. */
export function daysUntil(date: string, now: number = Date.now()): number {
  const target = new Date(date).getTime();
  if (Number.isNaN(target)) return Number.POSITIVE_INFINITY;
  return Math.ceil((target - now) / MS_PER_DAY);
}

/**
 * Annualised yield implied by buying a fraction on the secondary market:
 * the return over the remaining term, scaled to a year.
 *
 * A fraction bought at maturity value, or one whose invoice has already
 * matured, has no meaningful implied yield, so 0 is returned rather than a
 * misleading negative or infinite figure.
 */
export function impliedYieldPercent(
  askPrice: number,
  maturityValue: number,
  maturityDate: string,
  now: number = Date.now()
): number {
  if (!(askPrice > 0) || !(maturityValue > askPrice)) return 0;

  const days = daysUntil(maturityDate, now);
  if (!Number.isFinite(days) || days <= 0) return 0;

  const returnFraction = (maturityValue - askPrice) / askPrice;
  return (returnFraction * (DAYS_PER_YEAR / days)) * 100;
}

/** Yield for a listing, used by both the grid and the filter. */
export function listingImpliedYield(
  listing: Pick<ResaleListing, "ask_price" | "maturity_value" | "maturity_date">,
  now: number = Date.now()
): number {
  return impliedYieldPercent(listing.ask_price, listing.maturity_value, listing.maturity_date, now);
}

/** Total cost of buying `quantity` fractions — used by the buy modal. */
export function totalCost(askPrice: number, quantity: number): number {
  return askPrice * quantity;
}

export function isSoldOut(listing: Pick<ResaleListing, "remaining_quantity" | "status">): boolean {
  return listing.status === "sold" || listing.remaining_quantity <= 0;
}

/**
 * Client-side narrowing so filters respond immediately without a page reload.
 * The server is sent the same filters, so this is a fast mirror rather than
 * the only source of truth.
 */
export function filterListings(
  listings: ResaleListing[],
  filters: SecondaryMarketFilters,
  now: number = Date.now()
): ResaleListing[] {
  return listings.filter((listing) => {
    if (listing.status !== "active") return false;
    if (isSoldOut(listing)) return false;

    if (filters.invoiceType !== "all" && listing.invoice_type !== filters.invoiceType) {
      return false;
    }

    if (filters.minPrice > 0 && listing.ask_price < filters.minPrice) return false;
    if (filters.maxPrice > 0 && listing.ask_price > filters.maxPrice) return false;

    if (filters.minYield > 0 || filters.maxYield > 0) {
      const yieldPct = listingImpliedYield(listing, now);
      if (filters.minYield > 0 && yieldPct < filters.minYield) return false;
      if (filters.maxYield > 0 && yieldPct > filters.maxYield) return false;
    }

    if (filters.maxDaysToMaturity > 0) {
      const days = daysUntil(listing.maturity_date, now);
      if (!(days <= filters.maxDaysToMaturity)) return false;
    }

    return true;
  });
}

export { RESALE_INVOICE_TYPES };
