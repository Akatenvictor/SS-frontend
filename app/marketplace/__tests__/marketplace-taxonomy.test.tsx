import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import MarketplacePage from "../page";
import { useInfiniteQuery } from "@tanstack/react-query";
import * as api from "@/lib/api";

// The card now polls demand metrics per row; the taxonomy tests are not about
// that, and without a stub each of the four cards would issue its own query.
vi.mock("@/components/marketplace/InvestorDemandMetrics", () => ({
    InvestorDemandMetrics: () => null,
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return {
    ...actual,
    useInfiniteQuery: vi.fn(),
  };
});

const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/marketplace",
}));

const mockUseInfiniteQuery = vi.mocked(useInfiniteQuery);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function makeInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: "inv-1",
    title: "Test Invoice",
    seller: "seller",
    amount: 10000,
    raised: 5000,
    investor_count: 3,
    status: "open",
    due_date: "2026-12-01T00:00:00.000Z",
    yield_percentage: 15,
    has_more: false,
    next_cursor: null,
    ...overrides,
  };
}

const invoices = [
  makeInvoice({
    id: "1",
    title: "SME Lagos receivable",
    category: "sme",
    risk_tier: "low",
    region: "west_africa",
    tags: ["Agri", "Guaranteed"],
  }),
  makeInvoice({
    id: "2",
    title: "SME Dakar receivable",
    category: "sme",
    risk_tier: "high",
    region: "west_africa",
    tags: ["Trade"],
  }),
  makeInvoice({
    id: "3",
    title: "Real estate Nairobi lease",
    category: "real_estate",
    risk_tier: "high",
    region: "east_africa",
    tags: [],
  }),
  makeInvoice({
    id: "4",
    title: "Infrastructure Corridor bond",
    category: "infrastructure",
    risk_tier: "medium",
    region: "southern_africa",
    tags: ["Infrastructure"],
  }),
  makeInvoice({
    id: "5",
    title: "Cross-border freight",
    category: "trade_finance",
    risk_tier: "medium",
    region: "other",
    tags: [],
  }),
];

function setupMock(invoiceList = invoices) {
  mockUseInfiniteQuery.mockReturnValue({
    data: { pages: [{ invoices: invoiceList, has_more: false, next_cursor: null }] },
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
    isFetching: false,
  } as never);
}

function renderPage() {
  return render(<MarketplacePage />, { wrapper: createWrapper() });
}

function lastReplaceUrl(): string {
  const calls = mockReplace.mock.calls;
  return calls[calls.length - 1][0] as string;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchParams = new URLSearchParams();
  setupMock();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("category filter (issue #420)", () => {
  it("narrows to the selected sector", () => {
    renderPage();

    fireEvent.click(screen.getByTestId("filter-taxonomy-category-sme"));

    expect(screen.getByText("SME Lagos receivable")).toBeInTheDocument();
    expect(screen.getByText("SME Dakar receivable")).toBeInTheDocument();
    expect(screen.queryByText("Real estate Nairobi lease")).not.toBeInTheDocument();
    expect(screen.queryByText("Infrastructure Corridor bond")).not.toBeInTheDocument();
  });

  it("ORs several sectors within the dimension", () => {
    renderPage();

    fireEvent.click(screen.getByTestId("filter-taxonomy-category-sme"));
    fireEvent.click(screen.getByTestId("filter-taxonomy-category-infrastructure"));

    expect(screen.getByText("SME Lagos receivable")).toBeInTheDocument();
    expect(screen.getByText("Infrastructure Corridor bond")).toBeInTheDocument();
    expect(screen.queryByText("Real estate Nairobi lease")).not.toBeInTheDocument();
  });

  it("widens again when the sector is unchecked", () => {
    renderPage();

    const checkbox = screen.getByTestId("filter-taxonomy-category-sme");
    fireEvent.click(checkbox);
    fireEvent.click(checkbox);

    expect(screen.getByText("Real estate Nairobi lease")).toBeInTheDocument();
    expect(screen.getByText("Infrastructure Corridor bond")).toBeInTheDocument();
  });
});

describe("risk tier filter", () => {
  it("narrows to high risk", () => {
    renderPage();

    fireEvent.click(screen.getByTestId("filter-taxonomy-risk-high"));

    expect(screen.getByText("SME Dakar receivable")).toBeInTheDocument();
    expect(screen.getByText("Real estate Nairobi lease")).toBeInTheDocument();
    expect(screen.queryByText("SME Lagos receivable")).not.toBeInTheDocument();
  });

  it("narrows to low risk", () => {
    renderPage();

    fireEvent.click(screen.getByTestId("filter-taxonomy-risk-low"));

    expect(screen.getByText("SME Lagos receivable")).toBeInTheDocument();
    expect(screen.queryByText("SME Dakar receivable")).not.toBeInTheDocument();
  });
});

describe("region filter", () => {
  it("narrows to West Africa", () => {
    renderPage();

    fireEvent.click(screen.getByTestId("filter-taxonomy-region-west_africa"));

    expect(screen.getByText("SME Lagos receivable")).toBeInTheDocument();
    expect(screen.getByText("SME Dakar receivable")).toBeInTheDocument();
    expect(screen.queryByText("Real estate Nairobi lease")).not.toBeInTheDocument();
  });

  it("narrows to the Other bucket", () => {
    renderPage();

    fireEvent.click(screen.getByTestId("filter-taxonomy-region-other"));

    expect(screen.getByText("Cross-border freight")).toBeInTheDocument();
    expect(screen.queryByText("SME Lagos receivable")).not.toBeInTheDocument();
  });

  it("narrows to Southern Africa", () => {
    renderPage();

    fireEvent.click(screen.getByTestId("filter-taxonomy-region-southern_africa"));

    expect(screen.getByText("Infrastructure Corridor bond")).toBeInTheDocument();
    expect(screen.queryByText("Cross-border freight")).not.toBeInTheDocument();
  });
});

describe("combined dimensions", () => {
  it("ANDs sector with risk tier", () => {
    renderPage();

    fireEvent.click(screen.getByTestId("filter-taxonomy-category-sme"));
    fireEvent.click(screen.getByTestId("filter-taxonomy-risk-high"));

    expect(screen.getByText("SME Dakar receivable")).toBeInTheDocument();
    expect(screen.queryByText("SME Lagos receivable")).not.toBeInTheDocument();
  });

  it("ANDs all three dimensions at once", () => {
    renderPage();

    fireEvent.click(screen.getByTestId("filter-taxonomy-category-sme"));
    fireEvent.click(screen.getByTestId("filter-taxonomy-risk-high"));
    fireEvent.click(screen.getByTestId("filter-taxonomy-region-east_africa"));

    expect(screen.getByTestId("no-invoices-msg")).toBeInTheDocument();
  });

  it("combines with the pre-existing funding-status filter", () => {
    renderPage();

    fireEvent.click(screen.getByTestId("filter-status-open"));
    fireEvent.click(screen.getByTestId("filter-taxonomy-category-infrastructure"));

    expect(screen.getByText("Infrastructure Corridor bond")).toBeInTheDocument();
    expect(screen.queryByText("SME Lagos receivable")).not.toBeInTheDocument();
  });
});

describe("filter state in the URL (shareability)", () => {
  it("writes an applied sector to the query string", () => {
    renderPage();

    fireEvent.click(screen.getByTestId("filter-taxonomy-category-sme"));

    expect(mockReplace).toHaveBeenCalledWith(
      "/marketplace?category=sme",
      { scroll: false }
    );
  });

  it("writes all three dimensions", () => {
    renderPage();

    fireEvent.click(screen.getByTestId("filter-taxonomy-category-real_estate"));
    fireEvent.click(screen.getByTestId("filter-taxonomy-risk-low"));
    fireEvent.click(screen.getByTestId("filter-taxonomy-region-west_africa"));

    const url = lastReplaceUrl();
    expect(url).toContain("category=real_estate");
    expect(url).toContain("risk=low");
    expect(url).toContain("region=west_africa");
  });

  it("accumulates values in one dimension as a comma list", () => {
    renderPage();

    fireEvent.click(screen.getByTestId("filter-taxonomy-region-west_africa"));
    fireEvent.click(screen.getByTestId("filter-taxonomy-region-east_africa"));

    expect(lastReplaceUrl()).toContain("region=west_africa%2Ceast_africa");
  });

  it("restores applied filters from a shared URL on load", () => {
    mockSearchParams = new URLSearchParams("category=sme&risk=high");
    setupMock();
    renderPage();

    expect(screen.getByTestId("filter-taxonomy-category-sme")).toBeChecked();
    expect(screen.getByTestId("filter-taxonomy-risk-high")).toBeChecked();
    expect(screen.getByText("SME Dakar receivable")).toBeInTheDocument();
    expect(screen.queryByText("SME Lagos receivable")).not.toBeInTheDocument();
  });

  it("ignores an out-of-vocabulary value in a shared URL", () => {
    mockSearchParams = new URLSearchParams("category=cryptocurrency");
    setupMock();
    renderPage();

    expect(screen.getByText("SME Lagos receivable")).toBeInTheDocument();
    expect(screen.queryByTestId("taxonomy-filter-chips")).not.toBeInTheDocument();
  });

  it("keeps taxonomy params when an unrelated filter changes", () => {
    renderPage();

    fireEvent.click(screen.getByTestId("filter-taxonomy-category-sme"));
    fireEvent.click(screen.getByTestId("filter-status-open"));

    const url = lastReplaceUrl();
    expect(url).toContain("category=sme");
    expect(url).toContain("statuses=open");
  });

  it("clears taxonomy params from the URL when the taxonomy filters are reset", () => {
    renderPage();

    fireEvent.click(screen.getByTestId("filter-taxonomy-category-sme"));
    fireEvent.click(screen.getByTestId("filter-taxonomy-risk-high"));
    fireEvent.click(screen.getByTestId("clear-taxonomy-filters-btn"));

    expect(lastReplaceUrl()).not.toContain("category=");
    expect(lastReplaceUrl()).not.toContain("risk=");
  });

  it("is reset too by the panel's Clear, so it cannot survive a full reset", () => {
    renderPage();

    fireEvent.click(screen.getByTestId("filter-taxonomy-category-sme"));
    // The panel's Clear button is scoped to the panel filters, so it only
    // appears once one of those is set too.
    fireEvent.click(screen.getByTestId("filter-status-open"));
    fireEvent.click(screen.getByTestId("clear-filters-btn"));

    expect(lastReplaceUrl()).toBe("/marketplace");
    expect(screen.getByText("SME Lagos receivable")).toBeInTheDocument();
    expect(screen.getByText("Cross-border freight")).toBeInTheDocument();
  });

  it("sends taxonomy to the server as well as narrowing client-side", () => {
    renderPage();

    fireEvent.click(screen.getByTestId("filter-taxonomy-category-sme"));

    // The query key carries the taxonomy, so a backend that honours it narrows
    // on refresh too — which is what makes a shared link work for a recipient
    // who has never seen the page.
    const calls = mockUseInfiniteQuery.mock.calls;
    const queryKey = calls[calls.length - 1][0].queryKey as Record<string, string>[];
    expect(queryKey[1]).toMatchObject({ category: "sme" });
  });
});

describe("removable filter chips", () => {
  it("shows no chips when nothing is applied", () => {
    renderPage();
    expect(screen.queryByTestId("taxonomy-filter-chips")).not.toBeInTheDocument();
  });

  it("shows one labelled chip per applied value", () => {
    renderPage();

    fireEvent.click(screen.getByTestId("filter-taxonomy-category-sme"));
    fireEvent.click(screen.getByTestId("filter-taxonomy-risk-high"));
    fireEvent.click(screen.getByTestId("filter-taxonomy-region-west_africa"));

    expect(screen.getByText("Category: SME")).toBeInTheDocument();
    expect(screen.getByText("Risk: High Risk")).toBeInTheDocument();
    expect(screen.getByText("Region: West Africa")).toBeInTheDocument();
  });

  it("resets only the removed filter", () => {
    renderPage();

    fireEvent.click(screen.getByTestId("filter-taxonomy-category-sme"));
    fireEvent.click(screen.getByTestId("filter-taxonomy-risk-high"));
    fireEvent.click(screen.getByTestId("remove-filter-category-sme"));

    // Risk is still applied, so the low-risk SME invoice stays hidden.
    expect(screen.queryByText("SME Lagos receivable")).not.toBeInTheDocument();
    expect(screen.getByText("SME Dakar receivable")).toBeInTheDocument();
    expect(screen.getByText("Risk: High Risk")).toBeInTheDocument();
    expect(screen.queryByText("Category: SME")).not.toBeInTheDocument();
  });

  it("unchecks the filter's box when its chip is removed", () => {
    renderPage();

    fireEvent.click(screen.getByTestId("filter-taxonomy-category-sme"));
    fireEvent.click(screen.getByTestId("remove-filter-category-sme"));

    expect(screen.getByTestId("filter-taxonomy-category-sme")).not.toBeChecked();
  });

  it("removes the param from the URL when a chip is removed", () => {
    renderPage();

    fireEvent.click(screen.getByTestId("filter-taxonomy-category-sme"));
    fireEvent.click(screen.getByTestId("remove-filter-category-sme"));

    expect(lastReplaceUrl()).not.toContain("category=");
  });

  it("clears every taxonomy filter at once", () => {
    renderPage();

    fireEvent.click(screen.getByTestId("filter-taxonomy-category-sme"));
    fireEvent.click(screen.getByTestId("filter-taxonomy-risk-high"));
    fireEvent.click(screen.getByTestId("filter-taxonomy-region-west_africa"));
    fireEvent.click(screen.getByTestId("clear-taxonomy-filters-btn"));

    expect(screen.queryByTestId("taxonomy-filter-chips")).not.toBeInTheDocument();
    expect(screen.getByText("Real estate Nairobi lease")).toBeInTheDocument();
    expect(screen.getByText("Infrastructure Corridor bond")).toBeInTheDocument();
  });

  it("does not offer clear-all for a single chip", () => {
    renderPage();

    fireEvent.click(screen.getByTestId("filter-taxonomy-category-sme"));

    expect(screen.queryByTestId("clear-taxonomy-filters-btn")).not.toBeInTheDocument();
  });

  it("exposes a labelled remove control for each chip", () => {
    renderPage();

    fireEvent.click(screen.getByTestId("filter-taxonomy-category-sme"));

    expect(
      screen.getByRole("button", { name: "Remove filter Category: SME" })
    ).toBeInTheDocument();
  });
});

describe("tag pills on cards (issue #420)", () => {
  it("renders the issuer's tags as pills", () => {
    renderPage();

    const pills = screen.getAllByTestId("invoice-tag-pill").map((el) => el.textContent);
    expect(pills).toContain("Agri");
    expect(pills).toContain("Guaranteed");
  });

  it("renders no pills for an invoice the issuer left untagged", () => {
    renderPage();

    fireEvent.click(screen.getByTestId("filter-taxonomy-category-real_estate"));

    expect(screen.queryAllByTestId("invoice-tag-pill")).toHaveLength(0);
  });

  it("collapses tags beyond the visible cap into a counter", () => {
    setupMock([
      makeInvoice({
        id: "1",
        title: "Heavily tagged",
        tags: ["one", "two", "three", "four", "five", "six"],
      }),
    ]);
    renderPage();

    expect(screen.getAllByTestId("invoice-tag-pill")).toHaveLength(4);
    expect(screen.getByTestId("invoice-tag-overflow")).toHaveTextContent("+2");
  });
});

describe("empty state", () => {
  it("shows the empty state when a filter combination excludes everything", () => {
    renderPage();

    // Both SME invoices are in West Africa, so adding East Africa empties it.
    fireEvent.click(screen.getByTestId("filter-taxonomy-category-sme"));
    fireEvent.click(screen.getByTestId("filter-taxonomy-region-east_africa"));

    expect(screen.getByTestId("no-invoices-msg")).toHaveTextContent(
      "No invoices match your filters."
    );
  });

  it("offers a way out of the empty state", () => {
    renderPage();

    fireEvent.click(screen.getByTestId("filter-taxonomy-category-sme"));
    fireEvent.click(screen.getByTestId("filter-taxonomy-region-east_africa"));
    fireEvent.click(screen.getByTestId("empty-state-clear-filters"));

    expect(screen.getByText("SME Lagos receivable")).toBeInTheDocument();
  });

  it("distinguishes an empty marketplace from an over-filtered one", () => {
    setupMock([]);
    renderPage();

    expect(screen.getByTestId("no-invoices-msg")).toHaveTextContent(
      "No invoices have been published yet."
    );
    expect(
      screen.queryByTestId("empty-state-clear-filters")
    ).not.toBeInTheDocument();
  });

  it("does not blame filters when nothing has been applied", () => {
    setupMock([]);
    renderPage();

    expect(screen.getByTestId("no-invoices-msg")).not.toHaveTextContent(
      "match your filters"
    );
  });
});
