import { describe, it, expect } from "vitest";
import {
  resolveInvoiceCategory,
  INVOICE_CATEGORIES,
  CATEGORY_LABELS,
  type Invoice,
} from "@/lib/api";
import { searchInvoices, sortInvoices } from "@/components/marketplace/MarketplaceSearchBar";

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: "inv-1",
    title: "Test Invoice",
    seller: "GACME",
    amount: 10000,
    raised: 5000,
    investor_count: 3,
    status: "open",
    due_date: "2026-12-01T00:00:00Z",
    has_more: false,
    next_cursor: null,
    ...overrides,
  };
}

describe("resolveInvoiceCategory", () => {
  it("maps the canonical category names", () => {
    expect(resolveInvoiceCategory("trade_finance")).toBe("trade_finance");
    expect(resolveInvoiceCategory("real_estate")).toBe("real_estate");
    expect(resolveInvoiceCategory("sme")).toBe("sme");
  });

  it("tolerates hyphenated and spaced spellings", () => {
    expect(resolveInvoiceCategory("trade-finance")).toBe("trade_finance");
    expect(resolveInvoiceCategory("Real Estate")).toBe("real_estate");
  });

  it("folds the resale taxonomy into the browsable tabs", () => {
    expect(resolveInvoiceCategory("trade_receivable")).toBe("trade_finance");
    expect(resolveInvoiceCategory("supply_chain")).toBe("trade_finance");
    expect(resolveInvoiceCategory("promissory_note")).toBe("sme");
    expect(resolveInvoiceCategory("equipment_lease")).toBe("sme");
  });

  it("returns null for missing or unknown categories", () => {
    expect(resolveInvoiceCategory(undefined)).toBeNull();
    expect(resolveInvoiceCategory("")).toBeNull();
    expect(resolveInvoiceCategory("crypto_bridge")).toBeNull();
  });
});

describe("category metadata", () => {
  it("labels every tab", () => {
    for (const category of INVOICE_CATEGORIES) {
      expect(CATEGORY_LABELS[category]).toBeTruthy();
    }
  });

  it("exposes the four required tabs", () => {
    expect(INVOICE_CATEGORIES).toEqual([
      "all",
      "trade_finance",
      "real_estate",
      "sme",
    ]);
  });
});

describe("searchInvoices", () => {
  const invoices = [
    makeInvoice({ id: "1", title: "Logistics Invoice", seller: "GACME", invoice_number: "INV-001" }),
    makeInvoice({ id: "2", title: "Warehouse Lease", seller: "GBUILDCO", invoice_number: "INV-002" }),
  ];

  it("returns everything for an empty query", () => {
    expect(searchInvoices(invoices, "")).toHaveLength(2);
    expect(searchInvoices(invoices, "   ")).toHaveLength(2);
  });

  it("matches on title", () => {
    expect(searchInvoices(invoices, "logistics").map((i) => i.id)).toEqual(["1"]);
  });

  it("matches on issuer", () => {
    expect(searchInvoices(invoices, "gbuildco").map((i) => i.id)).toEqual(["2"]);
  });

  it("matches on invoice number", () => {
    expect(searchInvoices(invoices, "INV-002").map((i) => i.id)).toEqual(["2"]);
  });

  it("is case insensitive", () => {
    expect(searchInvoices(invoices, "LOGISTICS")).toHaveLength(1);
  });

  it("returns nothing when there is no match", () => {
    expect(searchInvoices(invoices, "zzzz")).toHaveLength(0);
  });
});

describe("sortInvoices", () => {
  const now = Date.now();
  const future = (days: number) =>
    new Date(now + days * 86_400_000).toISOString();

  it("highest_yield sorts descending and puts yield-less invoices last", () => {
    const sorted = sortInvoices(
      [
        makeInvoice({ id: "low", yield_percentage: 3 }),
        makeInvoice({ id: "none" }),
        makeInvoice({ id: "high", yield_percentage: 12 }),
      ],
      "highest_yield"
    );
    expect(sorted.map((i) => i.id)).toEqual(["high", "low", "none"]);
  });

  it("closing_soon puts live invoices first, soonest deadline leading", () => {
    const sorted = sortInvoices(
      [
        makeInvoice({ id: "later", due_date: future(60) }),
        makeInvoice({ id: "soon", due_date: future(2) }),
        makeInvoice({ id: "settled", status: "settled", due_date: future(1) }),
      ],
      "closing_soon"
    );
    expect(sorted.map((i) => i.id)).toEqual(["soon", "later", "settled"]);
  });

  it("newest sorts by created_at descending when present", () => {
    const sorted = sortInvoices(
      [
        makeInvoice({ id: "old", created_at: "2026-01-01T00:00:00Z" }),
        makeInvoice({ id: "new", created_at: "2026-06-01T00:00:00Z" }),
      ],
      "newest"
    );
    expect(sorted.map((i) => i.id)).toEqual(["new", "old"]);
  });

  it("does not mutate the input array", () => {
    const input = [
      makeInvoice({ id: "a", yield_percentage: 1 }),
      makeInvoice({ id: "b", yield_percentage: 9 }),
    ];
    const copy = [...input];
    sortInvoices(input, "highest_yield");
    expect(input).toEqual(copy);
  });
});
