import { describe, it, expect } from "vitest";
import {
    addToComparison,
    compareFundingPercent,
    isInvestable,
    MAX_COMPARE_ITEMS,
    removeFromComparison,
    toComparableInvoice,
    type ComparableInvoice,
} from "@/lib/compare";
import type { Invoice } from "@/lib/api";

function makeComparable(id: string, overrides: Partial<ComparableInvoice> = {}): ComparableInvoice {
    return {
        id,
        title: `${id} receivable`,
        issuer_id: "issuer-1",
        issuer_name: "Northwind Trading Ltd",
        face_value: 10_000,
        yield_bps: 825,
        maturity_date: "2026-12-01T00:00:00.000Z",
        status: "open",
        raised: 2_500,
        investor_count: 2,
        issuer_score: 88,
        ...overrides,
    };
}

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
    return {
        id: "inv-1",
        title: "Acme Corp Q3 receivable",
        seller: "GABC…XYZ",
        amount: 10_000,
        raised: 0,
        investor_count: 0,
        status: "open",
        due_date: "2030-01-01T00:00:00.000Z",
        has_more: false,
        next_cursor: null,
        ...overrides,
    };
}

describe("toComparableInvoice", () => {
    it("projects a marketplace invoice onto the comparison shape", () => {
        const result = toComparableInvoice(
            makeInvoice({ yield_bps: 1_050, issuer_score: 91 })
        );

        expect(result).toEqual({
            id: "inv-1",
            title: "Acme Corp Q3 receivable",
            issuer_id: "GABC…XYZ",
            issuer_name: "GABC…XYZ",
            face_value: 10_000,
            yield_bps: 1_050,
            maturity_date: "2030-01-01T00:00:00.000Z",
            status: "open",
            raised: 0,
            investor_count: 0,
            issuer_score: 91,
        });
    });

    it("degrades missing optional fields to safe defaults", () => {
        const result = toComparableInvoice(makeInvoice());

        expect(result.yield_bps).toBe(0);
        expect(result.issuer_score).toBeNull();
    });
});

describe("addToComparison", () => {
    it("appends a new item", () => {
        const result = addToComparison([makeComparable("a")], makeComparable("b"));
        expect(result.map((i) => i.id)).toEqual(["a", "b"]);
    });

    it("ignores an item already in the comparison", () => {
        const current = [makeComparable("a")];
        const result = addToComparison(current, makeComparable("a", { title: "changed" }));

        expect(result).toHaveLength(1);
        expect(result[0].title).toBe("a receivable");
    });

    it("refuses a fourth item and leaves the comparison untouched", () => {
        const current = [makeComparable("a"), makeComparable("b"), makeComparable("c")];
        const result = addToComparison(current, makeComparable("d"));

        expect(result).toHaveLength(MAX_COMPARE_ITEMS);
        expect(result.map((i) => i.id)).toEqual(["a", "b", "c"]);
    });

    it("accepts exactly three items", () => {
        let result: ComparableInvoice[] = [];
        for (const id of ["a", "b", "c"]) {
            result = addToComparison(result, makeComparable(id));
        }
        expect(result).toHaveLength(3);
    });
});

describe("removeFromComparison", () => {
    it("removes by id and preserves the order of the rest", () => {
        const current = [makeComparable("a"), makeComparable("b"), makeComparable("c")];
        const result = removeFromComparison(current, "b");

        expect(result.map((i) => i.id)).toEqual(["a", "c"]);
    });

    it("is a no-op for an unknown id", () => {
        const current = [makeComparable("a")];
        expect(removeFromComparison(current, "zzz")).toEqual(current);
    });
});

describe("compareFundingPercent", () => {
    it("computes the funded percentage", () => {
        expect(compareFundingPercent(makeComparable("a", { raised: 2_500 }))).toBe(25);
    });

    it("caps at 100 when over-funded", () => {
        expect(compareFundingPercent(makeComparable("a", { raised: 20_000 }))).toBe(100);
    });

    it("returns 0 for a zero face value", () => {
        expect(compareFundingPercent(makeComparable("a", { face_value: 0, raised: 100 }))).toBe(0);
    });
});

describe("isInvestable", () => {
    const now = new Date("2026-06-01T00:00:00.000Z");

    it("is true for an open invoice with future maturity", () => {
        expect(
            isInvestable(makeComparable("a", { maturity_date: "2026-07-01T00:00:00.000Z" }), now)
        ).toBe(true);
    });

    it("is false for an expired or non-open invoice", () => {
        expect(
            isInvestable(makeComparable("a", { maturity_date: "2026-01-01T00:00:00.000Z" }), now)
        ).toBe(false);
        expect(
            isInvestable(
                makeComparable("a", { status: "settled", maturity_date: "2026-07-01T00:00:00.000Z" }),
                now
            )
        ).toBe(false);
    });
});
