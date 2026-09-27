import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { InvestorPortfolio } from "../InvestorPortfolio";
import * as api from "@/lib/api";
import * as usePortfolioModule from "@/hooks/usePortfolio";

vi.mock("@/lib/api");
vi.mock("@/hooks/usePortfolio");

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

const mockPayouts = [
  {
    invoiceId: "inv-201",
    sellerName: "Stellar Tech",
    amountInvested: 1000,
    amountReceived: 1100,
    yield: 10,
    settledAt: "2026-07-01T12:00:00.000Z",
  },
  {
    invoiceId: "inv-202",
    sellerName: "Risky Business",
    amountInvested: 2000,
    amountReceived: 1500, // Shortfall
    yield: 5,
    settledAt: "2026-07-15T12:00:00.000Z",
  },
];

describe("Investor Dashboard Payout History", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(usePortfolioModule, "usePortfolio").mockReturnValue({
      data: {
        positions: [
          {
            invoice_id: "inv-1",
            title: "Active Inv 1",
            committed_amount: 5000,
            target_amount: 10000,
            status: "open",
            due_date: "2026-12-31",
          } as any,
        ],
      },
      isLoading: false,
    } as any);
  });

  it("Payout history tab renders on the investor dashboard", () => {
    render(<InvestorPortfolio />, { wrapper: createWrapper() });
    const tab = screen.getByTestId("tab-payout-history");
    expect(tab).toBeInTheDocument();
  });

  it("All required columns displayed correctly", async () => {
    vi.mocked(api.fetchInvestorPayouts).mockResolvedValue({
      payouts: [mockPayouts[0]],
      has_more: false,
      next_cursor: null,
    });

    render(<InvestorPortfolio />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByTestId("tab-payout-history"));

    await waitFor(() => {
      expect(screen.getByTestId("payout-history-table")).toBeInTheDocument();
    });

    expect(screen.getByText("Invoice ID")).toBeInTheDocument();
    expect(screen.getByText("Seller Name")).toBeInTheDocument();
    expect(screen.getByText("Amount Invested")).toBeInTheDocument();
    expect(screen.getByText("Amount Received")).toBeInTheDocument();
    expect(screen.getByText("Yield")).toBeInTheDocument();
    expect(screen.getByText("Settled At")).toBeInTheDocument();

    expect(screen.getByText("inv-201")).toBeInTheDocument();
    expect(screen.getByText("Stellar Tech")).toBeInTheDocument();
    expect(screen.getByText("1,000 XLM")).toBeInTheDocument();
    expect(screen.getByText("1,100 XLM")).toBeInTheDocument();
    expect(screen.getByText("10%")).toBeInTheDocument();
  });

  it("Shortfall rows highlighted in amber", async () => {
    vi.mocked(api.fetchInvestorPayouts).mockResolvedValue({
      payouts: mockPayouts,
      has_more: false,
      next_cursor: null,
    });

    render(<InvestorPortfolio />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByTestId("tab-payout-history"));

    await waitFor(() => {
      expect(screen.getByTestId("payout-row-inv-202")).toBeInTheDocument();
    });

    const normalRow = screen.getByTestId("payout-row-inv-201");
    const shortfallRow = screen.getByTestId("payout-row-inv-202");

    expect(shortfallRow).toHaveClass("bg-amber-500/15");
    expect(normalRow).not.toHaveClass("bg-amber-500/15");
  });

  it("Cursor pagination loads next page correctly", async () => {
    vi.mocked(api.fetchInvestorPayouts)
      .mockResolvedValueOnce({
        payouts: [mockPayouts[0]],
        has_more: true,
        next_cursor: "cursor-page-2",
      })
      .mockResolvedValueOnce({
        payouts: [mockPayouts[1]],
        has_more: false,
        next_cursor: null,
      });

    render(<InvestorPortfolio />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByTestId("tab-payout-history"));

    await waitFor(() => {
      expect(screen.getByTestId("payouts-load-next")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("payouts-load-next"));

    await waitFor(() => {
      expect(api.fetchInvestorPayouts).toHaveBeenCalledWith("cursor-page-2");
      expect(screen.getByTestId("payout-row-inv-202")).toBeInTheDocument();
    });
  });

  it("Empty state shown when no payouts exist", async () => {
    vi.mocked(api.fetchInvestorPayouts).mockResolvedValue({
      payouts: [],
      has_more: false,
      next_cursor: null,
    });

    render(<InvestorPortfolio />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByTestId("tab-payout-history"));

    await waitFor(() => {
      expect(screen.getByTestId("empty-payouts")).toBeInTheDocument();
    });

    expect(screen.getByText("No payouts yet")).toBeInTheDocument();
  });
});
