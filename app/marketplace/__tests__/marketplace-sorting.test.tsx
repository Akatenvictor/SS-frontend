import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
  usePathname: () => "/marketplace",
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
    status: "open",
    due_date: new Date(Date.now() + 86400000).toISOString(),
    has_more: false,
    next_cursor: null,
    ...overrides,
  };
}

const invoices = [
  makeInvoice({ id: "1", title: "Cheap Invoice", amount: 1000, due_date: "2026-12-01T00:00:00Z" }),
  makeInvoice({ id: "2", title: "Expensive Invoice", amount: 50000, due_date: "2026-06-01T00:00:00Z" }),
  makeInvoice({ id: "3", title: "Mid Invoice", amount: 10000, due_date: "2026-09-01T00:00:00Z" }),
];

function setupMock(invoiceList = invoices) {
  mockUseInfiniteQuery.mockReturnValue({
    data: { pages: [{ invoices: invoiceList, has_more: false, next_cursor: null }] },
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
    isFetching: false,
  } as any);
}

describe("Marketplace Sorting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMock();
    // Mock IntersectionObserver for jsdom environment
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
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("renders sort headers for Face Value and Deadline", () => {
    render(<MarketplacePage />, { wrapper: createWrapper() });
    expect(screen.getByTestId("sort-amount")).toBeInTheDocument();
    expect(screen.getByTestId("sort-due_date")).toBeInTheDocument();
  });

  it("sorts by face value ascending on first click", () => {
    render(<MarketplacePage />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByTestId("sort-amount"));

    const titles = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual(["Cheap Invoice", "Mid Invoice", "Expensive Invoice"]);
  });

  it("sorts by face value descending on second click", () => {
    render(<MarketplacePage />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByTestId("sort-amount"));
    fireEvent.click(screen.getByTestId("sort-amount"));

    const titles = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual(["Expensive Invoice", "Mid Invoice", "Cheap Invoice"]);
  });

  it("resets sort on third click", () => {
    render(<MarketplacePage />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByTestId("sort-amount"));
    fireEvent.click(screen.getByTestId("sort-amount"));
    fireEvent.click(screen.getByTestId("sort-amount"));

    const titles = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual(["Cheap Invoice", "Expensive Invoice", "Mid Invoice"]);
  });

  it("sorts by deadline ascending on first click", () => {
    render(<MarketplacePage />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByTestId("sort-due_date"));

    const titles = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual(["Expensive Invoice", "Mid Invoice", "Cheap Invoice"]);
  });

  it("sorts by deadline descending on second click", () => {
    render(<MarketplacePage />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByTestId("sort-due_date"));
    fireEvent.click(screen.getByTestId("sort-due_date"));

    const titles = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual(["Cheap Invoice", "Mid Invoice", "Expensive Invoice"]);
  });

  it("shows arrow indicator on active sort column", () => {
    render(<MarketplacePage />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByTestId("sort-amount"));

    const sortBtn = screen.getByTestId("sort-amount");
    expect(sortBtn.querySelector("svg")).toBeInTheDocument();
  });

  it("renders funding progress details for each marketplace invoice", () => {
    render(<MarketplacePage />, { wrapper: createWrapper() });

    expect(screen.getAllByTestId("funding-progress-bar")).toHaveLength(3);
    expect(screen.getAllByText("50.0%").length).toBeGreaterThan(0);
    expect(screen.getAllByText("5,000 XLM of 10,000 XLM").length).toBeGreaterThan(0);
  });

  it("polls the marketplace every 30 seconds for funding updates", () => {
    setupMock();

    render(<MarketplacePage />, { wrapper: createWrapper() });

    expect(mockUseInfiniteQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        refetchInterval: 30000,
        refetchIntervalInBackground: true,
      })
    );
  });
});

