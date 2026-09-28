"use client";

/**
 * Marketplace invoice taxonomy (#420)
 *
 * The three narrowing dimensions investors ask for — industry sector, risk
 * tier and geographic region — plus the issuer-set tag pills shown on cards.
 *
 * Deliberately free of React, like `lib/secondaryMarket.ts`: these rules decide
 * which listings a user sees, so they are tested directly rather than inferred
 * from rendered markup.
 */

import type { Invoice } from "@/lib/api";

/* ─── Taxonomy vocabulary ─────────────────────────────────────────────────── */

export const INVOICE_CATEGORIES = [
  "trade_finance",
  "real_estate",
  "sme",
  "infrastructure",
] as const;
export type InvoiceCategory = (typeof INVOICE_CATEGORIES)[number];

export const RISK_TIERS = ["low", "medium", "high"] as const;
export type RiskTier = (typeof RISK_TIERS)[number];

export const INVOICE_REGIONS = [
  "west_africa",
  "east_africa",
  "southern_africa",
  "other",
] as const;
export type InvoiceRegion = (typeof INVOICE_REGIONS)[number];

/** Option lists paired with human labels, for the filter checkboxes. */
export const CATEGORY_OPTIONS: { value: InvoiceCategory; label: string }[] = [
  { value: "trade_finance", label: "Trade Finance" },
  { value: "real_estate", label: "Real Estate" },
  { value: "sme", label: "SME" },
  { value: "infrastructure", label: "Infrastructure" },
];

export const RISK_TIER_OPTIONS: { value: RiskTier; label: string }[] = [
  { value: "low", label: "Low Risk" },
  { value: "medium", label: "Medium Risk" },
  { value: "high", label: "High Risk" },
];

export const REGION_OPTIONS: { value: InvoiceRegion; label: string }[] = [
  { value: "west_africa", label: "West Africa" },
  { value: "east_africa", label: "East Africa" },
  { value: "southern_africa", label: "Southern Africa" },
  { value: "other", label: "Other" },
];

/* ─── Derived risk tier ───────────────────────────────────────────────────── */

const GRADE_TO_TIER: Record<string, RiskTier> = {
  A: "low",
  B: "low",
  C: "medium",
  D: "high",
};

/**
 * The risk tier a listing falls into, preferring the API's own `risk_tier` and
 * falling back to the A–D risk grade when it is absent.
 *
 * The fallback matters: invoices created before the taxonomy shipped carry a
 * grade but no tier, and silently dropping them from every risk filter would
 * make the marketplace look empty.
 */
export function riskTierOf(
  invoice: Pick<Invoice, "risk_tier" | "risk_rating">
): RiskTier | null {
  const declared = normalizeRiskTier(invoice.risk_tier);
  if (declared) return declared;
  const grade = invoice.risk_rating?.tier;
  return grade ? (GRADE_TO_TIER[grade] ?? null) : null;
}

/** Case-insensitive coercion of an untrusted `risk_tier` value. */
export function normalizeRiskTier(raw: string | null | undefined): RiskTier | null {
  if (!raw) return null;
  const value = String(raw).trim().toLowerCase();
  return (RISK_TIERS as readonly string[]).includes(value) ? (value as RiskTier) : null;
}

/** Case- and separator-insensitive match, so "Trade Finance" == "trade_finance". */
export function normalizeCategory(raw: string | null | undefined): InvoiceCategory | null {
  const value = tokenize(raw);
  return value && (INVOICE_CATEGORIES as readonly string[]).includes(value)
    ? (value as InvoiceCategory)
    : null;
}

export function normalizeRegion(raw: string | null | undefined): InvoiceRegion | null {
  const value = tokenize(raw);
  return value && (INVOICE_REGIONS as readonly string[]).includes(value)
    ? (value as InvoiceRegion)
    : null;
}

function tokenize(raw: string | null | undefined): string {
  if (!raw) return "";
  return String(raw)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

/** Label lookup shared by the chips and the tag pills. */
export function categoryLabel(value: string): string {
  const match = CATEGORY_OPTIONS.find((o) => o.value === value);
  return match ? match.label : value;
}

export function regionLabel(value: string): string {
  const match = REGION_OPTIONS.find((o) => o.value === value);
  return match ? match.label : value;
}

export function riskTierLabel(value: string): string {
  const match = RISK_TIER_OPTIONS.find((o) => o.value === value);
  return match ? match.label : value;
}

/* ─── Tag pills ───────────────────────────────────────────────────────────── */

/**
 * Tags to render on a card, de-duplicated case-insensitively and blank-stripped.
 *
 * Tags are issuer-supplied free text, so they arrive with inconsistent casing
 * and stray whitespace. Both are normalised for display while the issuer's own
 * wording is preserved — an issuer that tags "Agri-Business" means that label,
 * not "Agri Business".
 */
export function invoiceTags(invoice: Pick<Invoice, "tags">): string[] {
  const raw = invoice.tags;
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const tag of raw) {
    if (typeof tag !== "string") continue;
    const trimmed = tag.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

/* ─── Filter state ────────────────────────────────────────────────────────── */

export interface TaxonomyFilterState {
  categories: InvoiceCategory[];
  riskTiers: RiskTier[];
  regions: InvoiceRegion[];
}

export const EMPTY_TAXONOMY_FILTERS: TaxonomyFilterState = {
  categories: [],
  riskTiers: [],
  regions: [],
};

export function hasActiveTaxonomyFilters(filters: TaxonomyFilterState): boolean {
  return (
    filters.categories.length > 0 ||
    filters.riskTiers.length > 0 ||
    filters.regions.length > 0
  );
}

export type TaxonomyDimension = "category" | "riskTier" | "region";

/**
 * Maps a dimension to its key in `TaxonomyFilterState`.
 *
 * The dimensions are singular because that is how they read in a chip id and a
 * test id; the state keys are plural because they hold arrays. Going through
 * this map keeps the two vocabularies from being conflated at each call site.
 */
const DIMENSION_KEYS: Record<TaxonomyDimension, keyof TaxonomyFilterState> = {
  category: "categories",
  riskTier: "riskTiers",
  region: "regions",
};

/** Toggles one value in one dimension, leaving the other two untouched. */
export function toggleTaxonomyFilter(
  filters: TaxonomyFilterState,
  dimension: TaxonomyDimension,
  value: string
): TaxonomyFilterState {
  const key = DIMENSION_KEYS[dimension];
  const current = filters[key] as string[];
  const next = current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];

  return { ...filters, [key]: next };
}

/**
 * Removes a single applied value, as a chip's × does.
 *
 * Idempotent when the value is not applied, so a stale chip cannot re-add or
 * otherwise disturb the other dimensions.
 */
export function removeTaxonomyFilterValue(
  filters: TaxonomyFilterState,
  dimension: TaxonomyDimension,
  value: string
): TaxonomyFilterState {
  const key = DIMENSION_KEYS[dimension];
  const current = filters[key] as string[];
  if (!current.includes(value)) return filters;
  return { ...filters, [key]: current.filter((v) => v !== value) };
}

/** Total number of applied values across all three dimensions. */
export function taxonomyFilterCount(filters: TaxonomyFilterState): number {
  return filters.categories.length + filters.riskTiers.length + filters.regions.length;
}

/* ─── URL serialisation ───────────────────────────────────────────────────── */

/**
 * Reads taxonomy filters out of a URL query string.
 *
 * Every value is validated against the closed vocabularies above, so a shared
 * or hand-edited URL carrying `?category=;drop%20table` narrows to nothing
 * rather than widening the result set.
 */
export function parseTaxonomyFilters(params: URLSearchParams): TaxonomyFilterState {
  return {
    categories: parseCsv(params.get("category"), INVOICE_CATEGORIES, normalizeCategory),
    riskTiers: parseCsv(params.get("risk"), RISK_TIERS, normalizeRiskTier),
    regions: parseCsv(params.get("region"), INVOICE_REGIONS, normalizeRegion),
  };
}

function parseCsv<T extends string>(
  raw: string | null,
  allowed: readonly T[],
  normalize: (value: string | null | undefined) => T | null
): T[] {
  if (!raw) return [];
  const result: T[] = [];
  for (const part of raw.split(",")) {
    const value = normalize(part);
    if (value && allowed.includes(value) && !result.includes(value)) {
      result.push(value);
    }
  }
  return result;
}

/**
 * Writes taxonomy filters into a query string.
 *
 * Empty dimensions are omitted rather than written as blank params, so an
 * unfiltered page keeps a clean `/marketplace` URL and stays shareable.
 */
export function applyTaxonomyFilters(
  params: URLSearchParams,
  filters: TaxonomyFilterState
): URLSearchParams {
  if (filters.categories.length > 0) {
    params.set("category", filters.categories.join(","));
  } else {
    params.delete("category");
  }
  if (filters.riskTiers.length > 0) {
    params.set("risk", filters.riskTiers.join(","));
  } else {
    params.delete("risk");
  }
  if (filters.regions.length > 0) {
    params.set("region", filters.regions.join(","));
  } else {
    params.delete("region");
  }
  return params;
}

/* ─── Removable chips ─────────────────────────────────────────────────────── */

export interface FilterChip {
  /** Stable identity for React keys and test queries. */
  id: string;
  dimension: TaxonomyDimension;
  /** Raw vocabulary value — what removal has to target. */
  value: string;
  /** Human label, e.g. "Category: Trade Finance". */
  label: string;
}

/** Flattens applied filters into one removable chip each, in a stable order. */
export function taxonomyFilterChips(filters: TaxonomyFilterState): FilterChip[] {
  return [
    ...filters.categories.map((value) => ({
      id: `category-${value}`,
      dimension: "category" as const,
      value,
      label: `Category: ${categoryLabel(value)}`,
    })),
    ...filters.riskTiers.map((value) => ({
      id: `risk-${value}`,
      dimension: "riskTier" as const,
      value,
      label: `Risk: ${riskTierLabel(value)}`,
    })),
    ...filters.regions.map((value) => ({
      id: `region-${value}`,
      dimension: "region" as const,
      value,
      label: `Region: ${regionLabel(value)}`,
    })),
  ];
}

/* ─── Narrowing ───────────────────────────────────────────────────────────── */

/**
 * Client-side narrowing, mirroring `filterListings` in `lib/secondaryMarket.ts`.
 *
 * Each dimension narrows independently and the three combine as AND, so
 * selecting "SME" and "High Risk" keeps only SME invoices that are also high
 * risk. Within a dimension the values are OR-ed, which is what a user
 * multi-selecting "West Africa" and "East Africa" expects.
 *
 * An invoice with no value for a dimension is only excluded when that
 * dimension is actively filtered, so unclassified legacy listings stay visible
 * under unrelated filters.
 */
export function filterByTaxonomy(
  invoices: Invoice[],
  filters: TaxonomyFilterState
): Invoice[] {
  return invoices.filter((invoice) => {
    if (filters.categories.length > 0) {
      const category = normalizeCategory(invoice.category);
      if (!category || !filters.categories.includes(category)) return false;
    }

    if (filters.riskTiers.length > 0) {
      const tier = riskTierOf(invoice);
      if (!tier || !filters.riskTiers.includes(tier)) return false;
    }

    if (filters.regions.length > 0) {
      const region = normalizeRegion(invoice.region);
      if (!region || !filters.regions.includes(region)) return false;
    }

    return true;
  });
}
