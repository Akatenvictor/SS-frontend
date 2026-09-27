import { describe, it, expect } from "vitest";
import { calculateActiveTotal, type InvestmentPosition } from "@/lib/portfolio";

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