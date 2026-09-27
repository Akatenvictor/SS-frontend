import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { InvoiceCard } from "../invoice-card";
import type { Invoice } from "@/lib/api";

const TARGET = 10000;

/** Build an invoice fixture with the funding numbers under test. */
function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
    return {
        id: "inv-1",
        title: "Acme Corp Q3 receivable",
        seller: "GABC…XYZ",
        amount: TARGET,
        raised: 0,
        investor_count: 0,
        status: "open",
        due_date: new Date("2030-01-01T00:00:00.000Z").toISOString(),
        has_more: false,
        next_cursor: null,
        ...overrides,
    };
}

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

/** The bar animates in behind a 100ms timer; run it out before asserting. */
function advanceAnimation() {
    act(() => {
        vi.advanceTimersByTime(200);
    });
}

describe("InvoiceCard funding progress", () => {
    it("renders a 50% bar for 5000 raised of a 10000 target", () => {
        render(<InvoiceCard invoice={makeInvoice({ raised: 5000 })} />);
        advanceAnimation();

        expect(screen.getByText("50.0%")).toBeInTheDocument();
        expect(screen.getByTestId("funding-progress-bar")).toHaveAttribute(
            "aria-valuenow",
            "50"
        );
    });

    it("renders a green 100% bar for a fully funded invoice", () => {
        render(
            <InvoiceCard invoice={makeInvoice({ raised: TARGET, status: "funded" })} />
        );
        advanceAnimation();

        expect(screen.getByText("100.0%")).toBeInTheDocument();
        expect(screen.getByTestId("funding-progress-bar")).toHaveClass("bg-green-500");
    });

    it("renders a 0% bar when nothing has been raised", () => {
        render(<InvoiceCard invoice={makeInvoice({ raised: 0 })} />);
        advanceAnimation();

        expect(screen.getByText("0.0%")).toBeInTheDocument();
        expect(screen.getByTestId("funding-progress-bar")).toHaveAttribute(
            "aria-valuenow",
            "0"
        );
    });

    it("caps the bar at 100% when raised exceeds the target, without overflowing", () => {
        render(<InvoiceCard invoice={makeInvoice({ raised: 15000 })} />);
        advanceAnimation();

        expect(screen.getByText("100.0%")).toBeInTheDocument();

        const bar = screen.getByTestId("funding-progress-bar");
        expect(bar).toHaveAttribute("aria-valuenow", "100");
        expect(bar.style.width).toBe("100%");
    });

    it("renders a 0% bar for a null raised value without crashing", () => {
        const invoice = makeInvoice({ raised: null as unknown as number });

        expect(() => render(<InvoiceCard invoice={invoice} />)).not.toThrow();
        advanceAnimation();

        expect(screen.getByText("0.0%")).toBeInTheDocument();
        expect(screen.getByText("0 XLM of 10,000 XLM")).toBeInTheDocument();
    });
});

