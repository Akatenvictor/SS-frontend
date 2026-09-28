import { describe, it, expect } from "vitest";
import { availableFractions, calculateActiveTotal, type InvestmentPosition } from "@/lib/portfolio";

describe("calculateActiveTotal", () => {
    it("returns correct active total for a multi-position portfolio", () => {
        const positions: InvestmentPosition[] = [
            { invoice_id: "1", invoice_title: "Invoice A", committed_amount: 5000, status: "active" },
            { invoice_id: "2", invoice_title: "Invoice B", committed_amount: 7500, status: "active" },
        ];

        const result = calculateActiveTotal(positions);

        expect(result.activeTotal).toBe(12500);
        expect(result.formattedTotal).toBe("12,500.00 XLM");
    });

    it("excludes settled invoice positions from the active total", () => {
        const positions: InvestmentPosition[] = [
            { invoice_id: "1", invoice_title: "Invoice A", committed_amount: 5000, status: "active" },
            { invoice_id: "2", invoice_title: "Invoice B", committed_amount: 3000, status: "settled" },
        ];

        const result = calculateActiveTotal(positions);

        expect(result.activeTotal).toBe(5000);
        expect(result.formattedTotal).toBe("5,000.00 XLM");
    });

    it("excludes expired invoice positions from the active total", () => {
        const positions: InvestmentPosition[] = [
            { invoice_id: "1", invoice_title: "Invoice A", committed_amount: 5000, status: "active" },
            { invoice_id: "2", invoice_title: "Invoice B", committed_amount: 2000, status: "expired" },
        ];

        const result = calculateActiveTotal(positions);

        expect(result.activeTotal).toBe(5000);
        expect(result.formattedTotal).toBe("5,000.00 XLM");
    });

    it("returns 0 when no active positions exist", () => {
        const positions: InvestmentPosition[] = [
            { invoice_id: "1", invoice_title: "Invoice A", committed_amount: 5000, status: "settled" },
            { invoice_id: "2", invoice_title: "Invoice B", committed_amount: 3000, status: "expired" },
        ];

        const result = calculateActiveTotal(positions);

        expect(result.activeTotal).toBe(0);
        expect(result.formattedTotal).toBe("0.00 XLM");
    });

    it("returns 0 for an empty portfolio", () => {
        const positions: InvestmentPosition[] = [];

        const result = calculateActiveTotal(positions);

        expect(result.activeTotal).toBe(0);
        expect(result.formattedTotal).toBe("0.00 XLM");
    });

    it("formats total to 2 decimal places", () => {
        const positions: InvestmentPosition[] = [
            { invoice_id: "1", invoice_title: "Invoice A", committed_amount: 12345, status: "active" },
        ];

        const result = calculateActiveTotal(positions);

        expect(result.formattedTotal).toBe("12,345.00 XLM");
    });
});
describe("availableFractions (issue #421)", () => {
    function position(overrides: Partial<InvestmentPosition> = {}): InvestmentPosition {
        return {
            invoice_id: "inv-1",
            invoice_title: "Acme receivable",
            committed_amount: 2500,
            status: "active",
            quantity: 100,
            ...overrides,
        };
    }

    it("is the full balance when nothing is listed", () => {
        expect(availableFractions(position({ quantity: 100, listed_quantity: 0 }))).toBe(100);
    });

    it("subtracts listed fractions, which are encumbered by a live sale", () => {
        expect(availableFractions(position({ quantity: 100, listed_quantity: 30 }))).toBe(70);
    });

    it("treats a missing listed_quantity as zero, for positions predating the field", () => {
        expect(availableFractions(position({ quantity: 100 }))).toBe(100);
    });

    it("is zero when every fraction is listed", () => {
        expect(availableFractions(position({ quantity: 100, listed_quantity: 100 }))).toBe(0);
    });

    it("clamps to zero rather than going negative if listed exceeds owned", () => {
        // A position whose listing outlasted a partial top-up must not offer a
        // negative allowance to the transfer modal.
        expect(availableFractions(position({ quantity: 10, listed_quantity: 25 }))).toBe(0);
    });

    it("is zero for a position with no quantity at all", () => {
        expect(availableFractions(position({ quantity: undefined }))).toBe(0);
    });
});
