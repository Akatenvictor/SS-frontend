import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { CreatorProfile } from "../CreatorProfile";
import { useInfiniteQuery } from "@tanstack/react-query";
import { formatXLM } from "@/lib/format";

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return {
    ...actual,
    useInfiniteQuery: vi.fn(),
  };
});

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
    amount: 10000,
    funded_amount: 5000,
    status: "open",
    created_at: "2026-08-20T00:00:00.000Z",
    ...overrides,
  };
}

const WALLET = "GWALLET1111111111111111111111111111111111111111111111";

function setupMock(overrides: Record<string, any> = {}) {
  mockUseInfiniteQuery.mockReturnValue({
    data: {
      pages: [
        {
          wallet: WALLET,
          display_name: "Stellar Studio",
          joined_at: "2026-01-15T00:00:00.000Z",
          kyc_verified: true,
          stats: {
            total_invoices: 12,
            total_funded: 45000,
            settlement_success_rate: 98,
          },
          invoices: [
            makeInvoice({ id: "inv-1", title: "Alpha Invoice", status: "settled" }),
            makeInvoice({ id: "inv-2", title: "Beta Invoice", status: "open" }),
          ],
          has_more: false,
          next_cursor: null,
        },
      ],
      pageParams: [undefined],
    } as any,
    isLoading: false,
    isError: false,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    ...overrides,
  } as any);
}

describe("CreatorProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("renders the profile header with wallet and join date", () => {
    setupMock();

    render(<CreatorProfile wallet={WALLET} />, { wrapper: createWrapper() });

    expect(screen.getByTestId("creator-profile-name")).toHaveTextContent(
      "Stellar Studio"
    );
    expect(screen.getByTestId("creator-wallet")).toHaveTextContent("GWAL...1111");
    expect(screen.getByTestId("creator-joined")).toHaveTextContent("Joined 1/15/2026");
  });

  it("shows the verification badge for KYC-approved sellers", () => {
    setupMock({ kyc_verified: false });

    render(<CreatorProfile wallet={WALLET} />, { wrapper: createWrapper() });

    expect(screen.getByTestId("creator-unverified-badge")).toBeInTheDocument();
    expect(screen.queryByTestId("creator-verified-badge")).not.toBeInTheDocument();
  });

  it("aggregates the funding stats across issued invoices", () => {
    setupMock();

    render(<CreatorProfile wallet={WALLET} />, { wrapper: createWrapper() });

    expect(screen.getByTestId("creator-stat-invoices")).toHaveTextContent("12");
    expect(screen.getByTestId("creator-stat-funded")).toHaveTextContent(
      formatXLM(45000)
    );
    expect(screen.getByTestId("creator-stat-settlement")).toHaveTextContent("98%");
  });

  it("lists issued invoices with status badges and links to the detail page", () => {
    setupMock();

    render(<CreatorProfile wallet={WALLET} />, { wrapper: createWrapper() });

    expect(screen.getByTestId("creator-invoice-list")).toBeInTheDocument();
    expect(screen.getByText("Alpha Invoice")).toBeInTheDocument();
    expect(screen.getByText("Beta Invoice")).toBeInTheDocument();

    const link = screen.getByTestId("creator-invoice-inv-1");
    expect(link).toHaveAttribute("href", "/marketplace/inv-1");
  });

  it("paginates the invoice list", async () => {
    const fetchNextPage = vi.fn();
    setupMock({ fetchNextPage, hasNextPage: true, isFetchingNextPage: false });

    render(<CreatorProfile wallet={WALLET} />, { wrapper: createWrapper() });

    const loadMore = screen.getByTestId("creator-invoices-load-more");
    fireEvent.click(loadMore);

    await waitFor(() => {
      expect(fetchNextPage).toHaveBeenCalledTimes(1);
    });
  });

  it("shows the empty state when no invoices have been issued", () => {
    setupMock({
      invoices: [],
      stats: { total_invoices: 0, total_funded: 0, settlement_success_rate: 0 },
    });

    render(<CreatorProfile wallet={WALLET} />, { wrapper: createWrapper() });

    expect(screen.getByTestId("creator-invoices-empty")).toBeInTheDocument();
  });

  it("shows an error card for an unknown wallet", () => {
    mockUseInfiniteQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    } as any);

    render(<CreatorProfile wallet={WALLET} />, { wrapper: createWrapper() });

    expect(screen.getByTestId("creator-profile-error")).toBeInTheDocument();
  });
});
