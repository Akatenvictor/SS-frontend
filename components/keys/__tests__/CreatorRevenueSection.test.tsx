import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { CreatorRevenueSection } from "../CreatorRevenueSection";
import * as api from "@/lib/api";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ address: "GCREATORTEST", jwt: "jwt-token" }),
}));

function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function monthlyBreakdown(): api.MonthlyRevenue[] {
  return [
    { month: "2025-09", royaltyEarned: 10 },
    { month: "2025-10", royaltyEarned: 20 },
    { month: "2025-11", royaltyEarned: 30 },
    { month: "2025-12", royaltyEarned: 40 },
    { month: "2026-01", royaltyEarned: 50 },
    { month: "2026-02", royaltyEarned: 60 },
    { month: "2026-03", royaltyEarned: 70 },
    { month: "2026-04", royaltyEarned: 80 },
    { month: "2026-05", royaltyEarned: 90 },
    { month: "2026-06", royaltyEarned: 100 },
    { month: "2026-07", royaltyEarned: 110 },
    { month: "2026-08", royaltyEarned: 120.5 },
  ];
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CreatorRevenueSection", () => {
  it("shows a loading skeleton while revenue data is fetching", () => {
    vi.spyOn(api, "fetchCreatorRevenue").mockReturnValue(
      new Promise(() => undefined)
    );

    renderWithClient(<CreatorRevenueSection keyId="key-1" />);

    expect(screen.getByTestId("creator-revenue-loading")).toBeInTheDocument();
  });

  it("renders the three royalty stat cards", async () => {
    vi.spyOn(api, "fetchCreatorRevenue").mockResolvedValue({
      totalRoyaltyEarned: 780.5,
      buyRoyaltyEarned: 500.25,
      sellRoyaltyEarned: 280.25,
      tradeCount: 42,
      monthlyBreakdown: monthlyBreakdown(),
    });

    renderWithClient(<CreatorRevenueSection keyId="key-1" />);

    await waitFor(() => {
      expect(screen.getByTestId("creator-revenue-section")).toBeInTheDocument();
    });

    expect(screen.getByTestId("revenue-total")).toHaveTextContent("780.50 XLM");
    expect(screen.getByTestId("revenue-buy")).toHaveTextContent("500.25 XLM");
    expect(screen.getByTestId("revenue-sell")).toHaveTextContent("280.25 XLM");
  });

  it("renders a 12-month chart with the correct monthly values", async () => {
    vi.spyOn(api, "fetchCreatorRevenue").mockResolvedValue({
      totalRoyaltyEarned: 780.5,
      buyRoyaltyEarned: 500.25,
      sellRoyaltyEarned: 280.25,
      tradeCount: 42,
      monthlyBreakdown: monthlyBreakdown(),
    });

    renderWithClient(<CreatorRevenueSection keyId="key-1" />);

    await waitFor(() => {
      expect(screen.getByTestId("revenue-chart")).toBeInTheDocument();
    });

    const values = screen.getByTestId("revenue-chart-values");
    expect(values.children).toHaveLength(12);
    expect(values).toHaveTextContent("Sep: 10.00 XLM");
    expect(values).toHaveTextContent("Aug: 120.50 XLM");
  });

  it("only charts the most recent 12 months when more are returned", async () => {
    vi.spyOn(api, "fetchCreatorRevenue").mockResolvedValue({
      totalRoyaltyEarned: 800,
      buyRoyaltyEarned: 500,
      sellRoyaltyEarned: 300,
      tradeCount: 50,
      monthlyBreakdown: [
        { month: "2025-07", royaltyEarned: 5 },
        { month: "2025-08", royaltyEarned: 7 },
        ...monthlyBreakdown(),
      ],
    });

    renderWithClient(<CreatorRevenueSection keyId="key-1" />);

    await waitFor(() => {
      expect(screen.getByTestId("revenue-chart-values")).toBeInTheDocument();
    });

    const values = screen.getByTestId("revenue-chart-values");
    expect(values.children).toHaveLength(12);
    expect(values).not.toHaveTextContent("5.00 XLM");
  });

  it("shows the empty state when tradeCount is zero", async () => {
    vi.spyOn(api, "fetchCreatorRevenue").mockResolvedValue({
      totalRoyaltyEarned: 0,
      buyRoyaltyEarned: 0,
      sellRoyaltyEarned: 0,
      tradeCount: 0,
      monthlyBreakdown: [],
    });

    renderWithClient(<CreatorRevenueSection keyId="key-1" />);

    await waitFor(() => {
      expect(screen.getByTestId("creator-revenue-empty")).toHaveTextContent(
        "No revenue yet"
      );
    });

    expect(screen.queryByTestId("revenue-chart")).not.toBeInTheDocument();
  });
});
