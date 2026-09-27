import { describe, it, expect } from "vitest";

import {
  CATEGORY_OPTIONS,
  EMPTY_TAXONOMY_FILTERS,
  INVOICE_CATEGORIES,
  INVOICE_REGIONS,
  RISK_TIERS,
  applyTaxonomyFilters,
  categoryLabel,
  filterByTaxonomy,
  hasActiveTaxonomyFilters,
  invoiceTags,
  normalizeCategory,
  normalizeRegion,
  parseTaxonomyFilters,
  regionLabel,
  removeTaxonomyFilterValue,
  riskTierLabel,
  riskTierOf,
  taxonomyFilterChips,
  toggleTaxonomyFilter,
  type TaxonomyFilterState,
} from "@/lib/invoiceTaxonomy";
import type { Invoice } from "@/lib/api";

const CATEGORY_VALUES = CATEGORY_OPTIONS.map((o) => o.value);
const RISK_VALUES = RISK_TIERS;
const REGION_VALUES = INVOICE_REGIONS;

function invoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: "inv-1",
    title: "Acme receivable",
    seller: "GSELLER",
    amount: 10000,
    raised: 5000,
    investor_count: 3,
    status: "open",
    due_date: "2026-12-01T00:00:00.000Z",
    has_more: false,
    next_cursor: null,
    ...overrides,
  };
}

function filters(overrides: Partial<TaxonomyFilterState> = {}): TaxonomyFilterState {
  return { ...EMPTY_TAXONOMY_FILTERS, ...overrides };
}

describe("taxonomy vocabulary", () => {
  it("exposes the four sectors, three risk tiers and four regions from the brief", () => {
    expect(CATEGORY_VALUES).toEqual([
      "trade_finance",
      "real_estate",
      "sme",
      "infrastructure",
    ]);
    expect(RISK_VALUES).toEqual(["low", "medium", "high"]);
    expect(REGION_VALUES).toEqual([
      "west_africa",
      "east_africa",
      "southern_africa",
      "other",
    ]);
  });

  it("labels every vocabulary value for the chips and the pills", () => {
    expect(categoryLabel("trade_finance")).toBe("Trade Finance");
    expect(categoryLabel("infrastructure")).toBe("Infrastructure");
    expect(riskTierLabel("low")).toBe("Low Risk");
    expect(riskTierLabel("high")).toBe("High Risk");
    expect(regionLabel("west_africa")).toBe("West Africa");
    expect(regionLabel("southern_africa")).toBe("Southern Africa");
  });

  it("passes through an unknown value rather than rendering a blank label", () => {
    expect(categoryLabel("shipping")).toBe("shipping");
  });
});

describe("normalising untrusted taxonomy values", () => {
  it("accepts the canonical snake_case form", () => {
    expect(normalizeCategory("trade_finance")).toBe("trade_finance");
    expect(normalizeRegion("east_africa")).toBe("east_africa");
  });

  it("accepts the display form an issuer might type", () => {
    expect(normalizeCategory("Trade Finance")).toBe("trade_finance");
    expect(normalizeCategory("  real-estate ")).toBe("real_estate");
    expect(normalizeRegion("West Africa")).toBe("west_africa");
  });

  it("rejects a value outside the closed vocabulary", () => {
    expect(normalizeCategory("cryptocurrency")).toBeNull();
    expect(normalizeRegion("antarctica")).toBeNull();
    expect(normalizeCategory(undefined)).toBeNull();
    expect(normalizeCategory("")).toBeNull();
  });
});

describe("riskTierOf", () => {
  it("prefers the API's own risk_tier", () => {
    expect(
      riskTierOf(invoice({ risk_tier: "high", risk_rating: { tier: "A" } }))
    ).toBe("high");
  });

  it("falls back to the A–D risk grade when no tier is declared", () => {
    expect(riskTierOf(invoice({ risk_rating: { tier: "A" } }))).toBe("low");
    expect(riskTierOf(invoice({ risk_rating: { tier: "B" } }))).toBe("low");
    expect(riskTierOf(invoice({ risk_rating: { tier: "C" } }))).toBe("medium");
    expect(riskTierOf(invoice({ risk_rating: { tier: "D" } }))).toBe("high");
  });

  it("returns null when the invoice carries neither", () => {
    expect(riskTierOf(invoice())).toBeNull();
    expect(riskTierOf(invoice({ risk_tier: "catastrophic" }))).toBeNull();
  });
});

describe("invoiceTags", () => {
  it("returns the issuer's tags as set", () => {
    expect(invoiceTags(invoice({ tags: ["Agri", "Guaranteed"] }))).toEqual([
      "Agri",
      "Guaranteed",
    ]);
  });

  it("strips blanks and de-duplicates case-insensitively", () => {
    expect(
      invoiceTags(invoice({ tags: ["  Agri  ", "agri", "", "   ", "AGRI"] }))
    ).toEqual(["Agri"]);
  });

  it("returns an empty list when tags are missing or not an array", () => {
    expect(invoiceTags(invoice())).toEqual([]);
    expect(invoiceTags(invoice({ tags: undefined }))).toEqual([]);
    expect(invoiceTags(invoice({ tags: "Agri" as unknown as string[] }))).toEqual([]);
  });
});

describe("filterByTaxonomy", () => {
  const corpus = [
    invoice({ id: "1", category: "sme", risk_tier: "low", region: "west_africa" }),
    invoice({ id: "2", category: "sme", risk_tier: "high", region: "west_africa" }),
    invoice({ id: "3", category: "real_estate", risk_tier: "high", region: "east_africa" }),
    invoice({ id: "4", category: "infrastructure", risk_tier: "medium", region: "other" }),
  ];

  const ids = (list: Invoice[]) => list.map((i) => i.id);

  it("returns everything when no dimension is filtered", () => {
    expect(ids(filterByTaxonomy(corpus, filters()))).toEqual(["1", "2", "3", "4"]);
  });

  it("narrows by sector on its own", () => {
    expect(ids(filterByTaxonomy(corpus, filters({ categories: ["sme"] })))).toEqual([
      "1",
      "2",
    ]);
  });

  it("narrows by risk tier on its own", () => {
    expect(ids(filterByTaxonomy(corpus, filters({ riskTiers: ["high"] })))).toEqual([
      "2",
      "3",
    ]);
  });

  it("narrows by region on its own", () => {
    expect(
      ids(filterByTaxonomy(corpus, filters({ regions: ["west_africa"] })))
    ).toEqual(["1", "2"]);
  });

  it("ORs values inside one dimension", () => {
    expect(
      ids(filterByTaxonomy(corpus, filters({ regions: ["east_africa", "other"] })))
    ).toEqual(["3", "4"]);
  });

  it("ANDs across dimensions — SME and high risk is only invoice 2", () => {
    expect(
      ids(filterByTaxonomy(corpus, filters({ categories: ["sme"], riskTiers: ["high"] })))
    ).toEqual(["2"]);
  });

  it("combines all three dimensions", () => {
    expect(
      ids(
        filterByTaxonomy(
          corpus,
          filters({
            categories: ["sme", "real_estate"],
            riskTiers: ["high"],
            regions: ["west_africa", "east_africa"],
          })
        )
      )
    ).toEqual(["2", "3"]);
  });

  it("excludes an invoice with no value for a filtered dimension", () => {
    const legacy = invoice({ id: "9", category: "sme" });
    expect(ids(filterByTaxonomy([legacy], filters({ riskTiers: ["low"] })))).toEqual([]);
  });

  it("keeps a legacy invoice visible under an unrelated dimension", () => {
    const legacy = invoice({ id: "9", category: "sme" });
    expect(ids(filterByTaxonomy([legacy], filters({ regions: ["other"] })))).toEqual([]);
    expect(ids(filterByTaxonomy([legacy], filters({ categories: ["sme"] })))).toEqual([
      "9",
    ]);
  });

  it("derives the risk tier from the grade when filtering risk", () => {
    const graded = [
      invoice({ id: "a", risk_rating: { tier: "A" } }),
      invoice({ id: "b", risk_rating: { tier: "D" } }),
    ];
    expect(ids(filterByTaxonomy(graded, filters({ riskTiers: ["low"] })))).toEqual(["a"]);
  });

  it("matches a display-form sector the API echoed back", () => {
    const titled = [invoice({ id: "7", category: "Trade Finance" })];
    expect(ids(filterByTaxonomy(titled, filters({ categories: ["trade_finance"] })))).toEqual(
      ["7"]
    );
  });
});

describe("toggleTaxonomyFilter", () => {
  it("adds a value, then removes it on a second toggle", () => {
    const added = toggleTaxonomyFilter(filters(), "category", "sme");
    expect(added.categories).toEqual(["sme"]);
    expect(toggleTaxonomyFilter(added, "category", "sme").categories).toEqual([]);
  });

  it("leaves the other dimensions untouched", () => {
    const next = toggleTaxonomyFilter(
      filters({ regions: ["other"] }),
      "riskTier",
      "low"
    );
    expect(next.riskTiers).toEqual(["low"]);
    expect(next.regions).toEqual(["other"]);
    expect(next.categories).toEqual([]);
  });

  it("accumulates several values in one dimension", () => {
    const next = toggleTaxonomyFilter(
      toggleTaxonomyFilter(filters(), "region", "west_africa"),
      "region",
      "east_africa"
    );
    expect(next.regions).toEqual(["west_africa", "east_africa"]);
  });
});

describe("removeTaxonomyFilterValue", () => {
  it("removes just that value and keeps the rest", () => {
    const next = removeTaxonomyFilterValue(
      filters({ regions: ["west_africa", "east_africa"], riskTiers: ["low"] }),
      "region",
      "west_africa"
    );
    expect(next.regions).toEqual(["east_africa"]);
    expect(next.riskTiers).toEqual(["low"]);
  });

  it("is idempotent for a value that is not applied", () => {
    const current = filters({ regions: ["other"] });
    expect(removeTaxonomyFilterValue(current, "region", "west_africa")).toBe(current);
  });
});

describe("hasActiveTaxonomyFilters", () => {
  it("is false for the empty state", () => {
    expect(hasActiveTaxonomyFilters(EMPTY_TAXONOMY_FILTERS)).toBe(false);
  });

  it("is true when any single dimension is set", () => {
    expect(hasActiveTaxonomyFilters(filters({ categories: ["sme"] }))).toBe(true);
    expect(hasActiveTaxonomyFilters(filters({ riskTiers: ["high"] }))).toBe(true);
    expect(hasActiveTaxonomyFilters(filters({ regions: ["other"] }))).toBe(true);
  });
});

describe("taxonomyFilterChips", () => {
  it("returns one labelled chip per applied value, in a stable order", () => {
    expect(
      taxonomyFilterChips(
        filters({
          categories: ["sme"],
          riskTiers: ["high"],
          regions: ["west_africa"],
        })
      )
    ).toEqual([
      {
        id: "category-sme",
        dimension: "category",
        value: "sme",
        label: "Category: SME",
      },
      {
        id: "risk-high",
        dimension: "riskTier",
        value: "high",
        label: "Risk: High Risk",
      },
      {
        id: "region-west_africa",
        dimension: "region",
        value: "west_africa",
        label: "Region: West Africa",
      },
    ]);
  });

  it("returns nothing when no filter is applied", () => {
    expect(taxonomyFilterChips(EMPTY_TAXONOMY_FILTERS)).toEqual([]);
  });
});

describe("URL round-trip (issue #420 shareability)", () => {
  it("reads all three dimensions out of a query string", () => {
    expect(
      parseTaxonomyFilters(
        new URLSearchParams(
          "category=sme,infrastructure&risk=high&region=west_africa,east_africa"
        )
      )
    ).toEqual({
      categories: ["sme", "infrastructure"],
      riskTiers: ["high"],
      regions: ["west_africa", "east_africa"],
    });
  });

  it("returns the empty state for a bare URL", () => {
    expect(parseTaxonomyFilters(new URLSearchParams())).toEqual(EMPTY_TAXONOMY_FILTERS);
  });

  it("drops values outside the vocabulary rather than widening the results", () => {
    expect(
      parseTaxonomyFilters(
        new URLSearchParams("category=sme,cryptocurrency&risk=catastrophic")
      )
    ).toEqual({ categories: ["sme"], riskTiers: [], regions: [] });
  });

  it("de-duplicates repeated values in the query string", () => {
    expect(
      parseTaxonomyFilters(new URLSearchParams("region=other,other")).regions
    ).toEqual(["other"]);
  });

  it("ignores empty segments from a trailing comma", () => {
    expect(
      parseTaxonomyFilters(new URLSearchParams("category=sme,")).categories
    ).toEqual(["sme"]);
  });

  it("writes applied dimensions as comma-joined params", () => {
    const params = applyTaxonomyFilters(
      new URLSearchParams(),
      filters({ categories: ["sme", "real_estate"], riskTiers: ["low"] })
    );
    expect(params.toString()).toBe("category=sme%2Creal_estate&risk=low");
  });

  it("omits empty dimensions so an unfiltered page keeps a clean URL", () => {
    const params = applyTaxonomyFilters(
      new URLSearchParams("search=acme"),
      EMPTY_TAXONOMY_FILTERS
    );
    expect(params.toString()).toBe("search=acme");
  });

  it("stale taxonomy params are replaced, not merged, when dimensions empty out", () => {
    const params = applyTaxonomyFilters(
      new URLSearchParams("category=sme&risk=high&region=other"),
      filters()
    );
    expect(params.toString()).toBe("");
  });

  it("survives a write/read round-trip", () => {
    const state = filters({
      categories: ["trade_finance"],
      riskTiers: ["medium"],
      regions: ["southern_africa"],
    });
    const params = applyTaxonomyFilters(new URLSearchParams(), state);
    expect(parseTaxonomyFilters(params)).toEqual(state);
  });
});
