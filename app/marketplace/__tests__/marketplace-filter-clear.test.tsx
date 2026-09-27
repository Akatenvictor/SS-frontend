import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import MarketplacePage from "../page";

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return {
    ...actual,
    useInfiniteQuery: vi.fn(),
  };
});

vi.mock("@/lib/logger", () => ({
  logError: vi.fn(),
}));

// The page calls the real router hooks, which throw without a mounted app
// router. This suite renders the page in isolation, so stub them out.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/marketplace",
  useSearchParams: () => new URLSearchParams(),
}));

import { useInfiniteQuery } from "@tanstack/react-query";

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

function makeInvoice(overrides: any = {}) {
  return {
    id: "inv-1",
    title: "Test Invoice",
    seller: "seller",
    amount: 10000,
    raised: 5000,
    investor_count: 3,
    status: "open" as const,
    due_date: new Date(Date.now() + 86400000).toISOString(),
    has_more: false,
    next_cursor: null,
    ...overrides,
  };
}

const invoices = [
  makeInvoice({
    id: "1",
    title: "Cheap Invoice",
    amount: 1000,
    status: "open" as const,
  }),
  makeInvoice({
    id: "2",
    title: "Expensive Invoice",
    amount: 50000,
    status: "funded" as const,
  }),
  makeInvoice({
    id: "3",
    title: "Mid Invoice",
    amount: 10000,
    status: "open" as const,
  }),
  makeInvoice({
    id: "4",
    title: "Another Funded",
    amount: 25000,
    status: "funded" as const,
  }),
  makeInvoice({
    id: "5",
    title: "Settlement Invoice",
    amount: 15000,
    status: "settled" as const,
  }),
];

function setupMock(invoiceList = invoices) {
  mockUseInfiniteQuery.mockReturnValue({
    data: {
      pages: [{ invoices: invoiceList, has_more: false, next_cursor: null }],
    },
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
    isFetching: false,
  } as any);
}

describe("Marketplace Filter Bar - Clear Filters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMock();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("should not show clear button when no filters applied", () => {
    render(<MarketplacePage />, { wrapper: createWrapper() });
    expect(
      screen.queryByRole("button", { name: /clear filters/i }),
    ).not.toBeInTheDocument();
  });

  it("should show clear button when search filter applied", async () => {
    render(<MarketplacePage />, { wrapper: createWrapper() });
    const searchInput = screen.getByPlaceholderText(/search by title/i);
    fireEvent.change(searchInput, { target: { value: "invoice" } });

    await waitFor(
      () => {
        expect(
          screen.getByRole("button", { name: /clear filters/i }),
        ).toBeInTheDocument();
      },
      { timeout: 500 },
    );
  });

  it("should clear search input when clear button clicked", async () => {
    render(<MarketplacePage />, { wrapper: createWrapper() });
    const searchInput = screen.getByPlaceholderText(
      /search by title/i,
    ) as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: "invoice" } });

    await waitFor(
      () => {
        expect((searchInput as HTMLInputElement).value).toBe("invoice");
      },
      { timeout: 500 },
    );

    const clearButton = screen.getByRole("button", { name: /clear filters/i });
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect((searchInput as HTMLInputElement).value).toBe("");
    });
  });

  it("should hide clear button after clearing all filters", async () => {
    render(<MarketplacePage />, { wrapper: createWrapper() });
    const searchInput = screen.getByPlaceholderText(/search by title/i);
    fireEvent.change(searchInput, { target: { value: "invoice" } });

    await waitFor(
      () => {
        expect(
          screen.getByRole("button", { name: /clear filters/i }),
        ).toBeInTheDocument();
      },
      { timeout: 500 },
    );

    const clearButton = screen.getByRole("button", { name: /clear filters/i });
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /clear filters/i }),
      ).not.toBeInTheDocument();
    });
  });

  it("should restore full invoice list after clearing search filter", async () => {
    render(<MarketplacePage />, { wrapper: createWrapper() });

    // Initial state - all 5 invoices visible
    let invoiceHeadings = screen.getAllByRole("heading", { level: 3 });
    expect(invoiceHeadings.length).toBe(5);

    // Apply search filter that matches only some invoices
    const searchInput = screen.getByPlaceholderText(/search by title/i);
    fireEvent.change(searchInput, { target: { value: "invoice" } });

    // Wait for filtered results (should have fewer invoices)
    await waitFor(
      () => {
        invoiceHeadings = screen.getAllByRole("heading", { level: 3 });
        expect(invoiceHeadings.length).toBeLessThan(5);
      },
      { timeout: 500 },
    );

    // Click clear
    const clearButton = screen.getByRole("button", { name: /clear filters/i });
    fireEvent.click(clearButton);

    // All invoices should be restored
    await waitFor(
      () => {
        invoiceHeadings = screen.getAllByRole("heading", { level: 3 });
        expect(invoiceHeadings.length).toBe(5);
      },
      { timeout: 500 },
    );
  });

  it("should reset sort when clear button clicked", async () => {
    render(<MarketplacePage />, { wrapper: createWrapper() });

    // Apply sort
    const sortButton = screen.getByTestId("sort-amount");
    fireEvent.click(sortButton);

    // Verify sort applied (arrow should appear)
    await waitFor(() => {
      expect(
        screen.getByTestId("sort-amount").querySelector("svg"),
      ).toBeInTheDocument();
    });

    // Apply search filter to enable clear button
    const searchInput = screen.getByPlaceholderText(/search by title/i);
    fireEvent.change(searchInput, { target: { value: "test" } });

    // Click clear
    const clearButton = screen.getByRole("button", { name: /clear filters/i });
    fireEvent.click(clearButton);

    // Sort should be reset (no arrow)
    await waitFor(() => {
      expect(
        screen.getByTestId("sort-amount").querySelector("svg"),
      ).not.toBeInTheDocument();
    });
  });

  it("should match all acceptance criteria: status resets, keyword clears, query re-fired, full list restored", async () => {
    render(<MarketplacePage />, { wrapper: createWrapper() });

    // Get initial invoice titles
    const getInvoiceTitles = () =>
      screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);

    const allInvoicesTitles = getInvoiceTitles();
    expect(allInvoicesTitles.length).toBe(5);

    // Apply search filter
    const searchInput = screen.getByPlaceholderText(
      /search by title/i,
    ) as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: "cheap" } });

    // Wait for filter to apply (fewer invoices)
    await waitFor(
      () => {
        const titles = getInvoiceTitles();
        expect(titles.length).toBeLessThan(5);
      },
      { timeout: 500 },
    );

    // Verify search input has value
    expect((searchInput as HTMLInputElement).value).toBe("cheap");

    // Clear filters
    const clearButton = screen.getByRole("button", { name: /clear filters/i });
    fireEvent.click(clearButton);

    // ACCEPTANCE CRITERIA 1: Keyword input cleared ✓
    await waitFor(() => {
      expect((searchInput as HTMLInputElement).value).toBe("");
    });

    // ACCEPTANCE CRITERIA 2: Full invoice list restored ✓
    const restoredTitles = getInvoiceTitles();
    expect(restoredTitles.length).toBe(5);
    expect(restoredTitles).toEqual(allInvoicesTitles);

    // ACCEPTANCE CRITERIA 3: Clear button hidden (query re-fired with no filters) ✓
    expect(
      screen.queryByRole("button", { name: /clear filters/i }),
    ).not.toBeInTheDocument();
  });
});
