import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import MarketplacePage from "../page";
import { useInfiniteQuery } from "@tanstack/react-query";

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return {
    ...actual,
    useInfiniteQuery: vi.fn(),
  };
});

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
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

function makeInvoice(overrides: any = {}) {
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

const mockInvoices = [
  makeInvoice({ id: "1", title: "Open Low Yield", status: "open", yield_percentage: 5, due_date: "2026-05-01T00:00:00Z" }),
  makeInvoice({ id: "2", title: "Funded High Yield", status: "funded", yield_percentage: 20, due_date: "2026-08-01T00:00:00Z" }),
  makeInvoice({ id: "3", title: "Settled Mid Yield", status: "settled", yield_percentage: 12, due_date: "2026-11-01T00:00:00Z" }),
];

function setupMock(invoiceList = mockInvoices) {
  mockUseInfiniteQuery.mockReturnValue({
    data: { pages: [{ invoices: invoiceList, has_more: false, next_cursor: null }] },
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
    isFetching: false,
  } as any);
}

describe("Marketplace Filter Panel & URL Sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("Funding status filter correctly narrows results", () => {
    render(<MarketplacePage />, { wrapper: createWrapper() });

    const openCheckbox = screen.getByTestId("filter-status-open");
    fireEvent.click(openCheckbox);

    expect(screen.getByText("Open Low Yield")).toBeInTheDocument();
    expect(screen.queryByText("Funded High Yield")).not.toBeInTheDocument();
    expect(screen.queryByText("Settled Mid Yield")).not.toBeInTheDocument();
  });

  it("Minimum yield slider filters out invoices below the selected yield", () => {
    render(<MarketplacePage />, { wrapper: createWrapper() });

    const slider = screen.getByTestId("min-yield-slider");
    fireEvent.change(slider, { target: { value: "10" } });

    expect(screen.queryByText("Open Low Yield")).not.toBeInTheDocument();
    expect(screen.getByText("Funded High Yield")).toBeInTheDocument();
    expect(screen.getByText("Settled Mid Yield")).toBeInTheDocument();
  });

  it("Due date range filters invoices correctly", () => {
    render(<MarketplacePage />, { wrapper: createWrapper() });

    const fromInput = screen.getByTestId("from-date-input");
    const toInput = screen.getByTestId("to-date-input");

    fireEvent.change(fromInput, { target: { value: "2026-06-01" } });
    fireEvent.change(toInput, { target: { value: "2026-09-01" } });

    expect(screen.queryByText("Open Low Yield")).not.toBeInTheDocument();
    expect(screen.getByText("Funded High Yield")).toBeInTheDocument();
    expect(screen.queryByText("Settled Mid Yield")).not.toBeInTheDocument();
  });

  it("Active filters reflected in the URL query string", () => {
    render(<MarketplacePage />, { wrapper: createWrapper() });

    const slider = screen.getByTestId("min-yield-slider");
    fireEvent.change(slider, { target: { value: "15" } });

    expect(mockReplace).toHaveBeenCalledWith("/marketplace?minYield=15", { scroll: false });
  });

  it("Clearing all filters restores the full unfiltered list", () => {
    render(<MarketplacePage />, { wrapper: createWrapper() });

    const slider = screen.getByTestId("min-yield-slider");
    fireEvent.change(slider, { target: { value: "25" } });

    expect(screen.getByTestId("no-invoices-msg")).toBeInTheDocument();

    const clearBtn = screen.getByTestId("clear-filters-btn");
    fireEvent.click(clearBtn);

    expect(screen.getByText("Open Low Yield")).toBeInTheDocument();
    expect(screen.getByText("Funded High Yield")).toBeInTheDocument();
    expect(screen.getByText("Settled Mid Yield")).toBeInTheDocument();
  });
});
