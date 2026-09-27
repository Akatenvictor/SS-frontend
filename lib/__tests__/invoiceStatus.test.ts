import { describe, expect, it } from "vitest";
import {
  INVOICE_TABS,
  countByTab,
  filterByTab,
  isDeletable,
  isEditable,
  matchesTab,
} from "@/lib/invoiceStatus";

const invoices = [
  { id: "1", status: "draft" as const },
  { id: "2", status: "draft" as const },
  { id: "3", status: "rejected" as const },
  { id: "4", status: "pending" as const },
  { id: "5", status: "open" as const },
  { id: "6", status: "funded" as const },
  { id: "7", status: "settled" as const },
];

describe("tab filtering", () => {
  it("routes each status to exactly one tab", () => {
    for (const invoice of invoices) {
      const tabs = INVOICE_TABS.filter((tab) => matchesTab(invoice, tab));
      expect(tabs).toHaveLength(1);
    }
  });

  it("puts rejected invoices in the draft tab so they stay actionable", () => {
    expect(filterByTab(invoices, "draft").map((i) => i.id)).toEqual(["1", "2", "3"]);
  });

  it("treats every open-for-investment status as live", () => {
    for (const status of ["open", "published", "active"] as const) {
      expect(matchesTab({ status }, "live")).toBe(true);
    }
  });

  it("filters each remaining tab correctly", () => {
    expect(filterByTab(invoices, "pending").map((i) => i.id)).toEqual(["4"]);
    expect(filterByTab(invoices, "live").map((i) => i.id)).toEqual(["5"]);
    expect(filterByTab(invoices, "funded").map((i) => i.id)).toEqual(["6"]);
    expect(filterByTab(invoices, "settled").map((i) => i.id)).toEqual(["7"]);
  });

  it("preserves input order within a tab", () => {
    const reversed = [...invoices].reverse();
    expect(filterByTab(reversed, "draft").map((i) => i.id)).toEqual(["3", "2", "1"]);
  });

  it("counts every tab, including empty ones", () => {
    expect(countByTab(invoices)).toEqual({
      draft: 3,
      pending: 1,
      live: 1,
      funded: 1,
      settled: 1,
    });

    expect(countByTab([])).toEqual({
      draft: 0,
      pending: 0,
      live: 0,
      funded: 0,
      settled: 0,
    });
  });
});

describe("permitted actions", () => {
  it("allows editing drafts and rejected invoices only", () => {
    expect(isEditable({ status: "draft" })).toBe(true);
    expect(isEditable({ status: "rejected" })).toBe(true);

    for (const status of ["pending", "open", "funded", "settled"] as const) {
      expect(isEditable({ status })).toBe(false);
    }
  });

  it("allows deleting drafts only", () => {
    expect(isDeletable({ status: "draft" })).toBe(true);

    // A rejected invoice has been through review — it is resubmitted, not deleted.
    for (const status of ["rejected", "pending", "open", "funded", "settled"] as const) {
      expect(isDeletable({ status })).toBe(false);
    }
  });
});
