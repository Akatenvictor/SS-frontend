import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { InvoiceComparisonTable, fundedPercent } from "../InvoiceComparisonTable";
import type { Invoice } from "@/lib/api";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({}),
  usePathname: () => "/marketplace",
  useSearchParams: () => new URLSearchParams(),
}));

const NOW = new Date("2026-06-01T00:00:00.000Z");

// Radix tooltips and the funding bar both measure via ResizeObserver, which
// jsdom does not provide.
beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
});

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: "inv-1",
    title: "Acme Corp Q3 receivable",
    seller: "GABCISSUER",
    amount: 10_000,
    raised: 2_500,
    investor_count: 2,
    status: "open",
    due_date: "2026-12-01T00:00:00.000Z",
    yield_percentage: 8.25,
    issuer_score: 88,
    has_more: false,
    next_cursor: null,
    ...overrides,
  };
}

describe("fundedPercent", () => {
  it("computes the funded percentage", () => {
    expect(fundedPercent(makeInvoice({ raised: 2_500, amount: 10_000 }))).toBe(25);
  });

  it("caps over-funding at 100", () => {
    expect(fundedPercent(makeInvoice({ raised: 20_000 }))).toBe(100);
  });

  it("returns 0 for a zero face value", () => {
    expect(fundedPercent(makeInvoice({ amount: 0, raised: 100 }))).toBe(0);
  });
});

describe("InvoiceComparisonTable", () => {
  const items = [
    makeInvoice({ id: "a", yield_percentage: 8.25, amount: 10_000, raised: 2_500, issuer_score: 88 }),
    makeInvoice({ id: "b", yield_percentage: 10.5, amount: 25_000, raised: 25_000, issuer_score: undefined }),
  ];

  it("renders nothing when no invoices are selected", () => {
    const { container } = render(<InvoiceComparisonTable invoices={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders one column per invoice", () => {
    render(<InvoiceComparisonTable invoices={items} now={NOW} />);

    expect(screen.getByTestId("compare-table")).toBeInTheDocument();
    expect(screen.getByTestId("compare-column-a")).toHaveTextContent("Acme Corp Q3 receivable");
    expect(screen.getByTestId("compare-column-b")).toBeInTheDocument();
  });

  it("renders yield, maturity, face value and issuer score per column", () => {
    render(<InvoiceComparisonTable invoices={items} now={NOW} />);

    expect(screen.getByTestId("row-yield-a")).toHaveTextContent("8.25%");
    expect(screen.getByTestId("row-yield-b")).toHaveTextContent("10.50%");
    expect(screen.getByTestId("row-face-value-a")).toHaveTextContent("10,000 XLM");
    expect(screen.getByTestId("row-face-value-b")).toHaveTextContent("25,000 XLM");
    expect(screen.getByTestId("row-maturity-a")).not.toBeEmptyDOMElement();
    expect(screen.getByTestId("row-issuer-score-a")).toHaveTextContent("88");
  });

  it("marks an issuer with no settlement history instead of scoring it zero", () => {
    render(<InvoiceComparisonTable invoices={items} now={NOW} />);
    expect(screen.getByTestId("row-issuer-score-b")).toHaveTextContent("No track record");
  });

  it("shows funding progress per column", () => {
    render(<InvoiceComparisonTable invoices={items} now={NOW} />);

    expect(within(screen.getByTestId("row-funding-a")).getByText("25.0%")).toBeInTheDocument();
    expect(within(screen.getByTestId("row-funding-b")).getByText("100.0%")).toBeInTheDocument();
  });

  it("shows N/A when no yield has been published", () => {
    render(
      <InvoiceComparisonTable invoices={[makeInvoice({ yield_percentage: undefined })]} now={NOW} />
    );
    expect(screen.getByTestId("row-yield-inv-1")).toHaveTextContent("N/A");
  });

  it("links each invest CTA to the correct invoice detail page", () => {
    render(<InvoiceComparisonTable invoices={items} now={NOW} />);

    expect(screen.getByTestId("compare-invest-a")).toHaveAttribute("href", "/marketplace/a");
    expect(screen.getByTestId("compare-invest-b")).toHaveAttribute("href", "/marketplace/b");
  });

  it("links the issuer cell to the issuer profile", () => {
    render(<InvoiceComparisonTable invoices={items} now={NOW} />);
    expect(screen.getByTestId("row-issuer-a").querySelector("a")).toHaveAttribute(
      "href",
      "/issuers/GABCISSUER"
    );
  });

  it("hides the invest CTA for a settled invoice", () => {
    render(
      <InvoiceComparisonTable invoices={[makeInvoice({ status: "settled" })]} now={NOW} />
    );

    expect(screen.queryByTestId("compare-invest-inv-1")).not.toBeInTheDocument();
    expect(screen.getByTestId("compare-closed-inv-1")).toHaveTextContent(
      "Not open for investment"
    );
  });

  it("hides the invest CTA once the invoice has matured", () => {
    render(
      <InvoiceComparisonTable
        invoices={[makeInvoice({ due_date: "2026-01-01T00:00:00.000Z" })]}
        now={NOW}
      />
    );

    expect(screen.queryByTestId("compare-invest-inv-1")).not.toBeInTheDocument();
  });

  it("offers the invest CTA when the invoice is open and still funding", () => {
    render(
      <InvoiceComparisonTable
        invoices={[makeInvoice({ due_date: "2026-09-01T00:00:00.000Z" })]}
        now={NOW}
      />
    );

    expect(screen.getByTestId("compare-invest-inv-1")).toBeInTheDocument();
  });
});
