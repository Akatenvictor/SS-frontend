import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { TopInvestorsLeaderboard } from "../TopInvestorsLeaderboard";
import * as api from "@/lib/api";

function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const mockInvestors: api.LeaderboardInvestor[] = [
  { address: "GBXGQ6VCAW3U5H6F3D3K3L3M3N3O3P3Q3R3S3T3U3V3W3X3Y3Z1", total_committed: 5000, invoice_count: 3 },
  { address: "GCDGQ6VCAW3U5H6F3D3K3L3M3N3O3P3Q3R3S3T3U3V3W3X3Y3Z2", total_committed: 12000, invoice_count: 8 },
  { address: "GEEGQ6VCAW3U5H6F3D3K3L3M3N3O3P3Q3R3S3T3U3V3W3X3Y3Z3", total_committed: 2000, invoice_count: 1 },
  { address: "GFGGQ6VCAW3U5H6F3D3K3L3M3N3O3P3Q3R3S3T3U3V3W3X3Y3Z4", total_committed: 8000, invoice_count: 5 },
  { address: "GHHGQ6VCAW3U5H6F3D3K3L3M3N3O3P3Q3R3S3T3U3V3W3X3Y3Z5", total_committed: 15000, invoice_count: 10 },
  { address: "GIIGQ6VCAW3U5H6F3D3K3L3M3N3O3P3Q3R3S3T3U3V3W3X3Y3Z6", total_committed: 1000, invoice_count: 1 },
];

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TopInvestorsLeaderboard", () => {
  it("shows skeleton loading state when fetching", () => {
    vi.spyOn(api, "fetchLeaderboard").mockReturnValue(new Promise(() => {}));
    renderWithClient(<TopInvestorsLeaderboard />);
    expect(screen.getByTestId("leaderboard-loading")).toBeInTheDocument();
  });

  it("hides section when no investors are returned", async () => {
    vi.spyOn(api, "fetchLeaderboard").mockResolvedValue([]);
    renderWithClient(<TopInvestorsLeaderboard />);

    const { waitFor } = await import("@testing-library/react");
    await waitFor(() => {
      expect(screen.queryByTestId("leaderboard-loading")).not.toBeInTheDocument();
    });
    expect(screen.queryByTestId("leaderboard-section")).not.toBeInTheDocument();
  });


  it("displays top 5 investors in descending committed XLM order", async () => {
    vi.spyOn(api, "fetchLeaderboard").mockResolvedValue(mockInvestors);
    renderWithClient(<TopInvestorsLeaderboard />);

    const section = await screen.findByTestId("leaderboard-section");
    expect(section).toBeInTheDocument();

    // Check rows - should contain rank 1 through 5, highest committed first (15000 XLM, 12000 XLM, 8000 XLM, 5000 XLM, 2000 XLM)
    expect(screen.getByText("GHHG...Y3Z5")).toBeInTheDocument(); // 15,000
    expect(screen.getByText("GCDG...Y3Z2")).toBeInTheDocument(); // 12,000
    expect(screen.getByText("GFGG...Y3Z4")).toBeInTheDocument(); // 8,000
    expect(screen.getByText("GBXG...Y3Z1")).toBeInTheDocument(); // 5,000
    expect(screen.getByText("GEEG...Y3Z3")).toBeInTheDocument(); // 2,000

    // 6th investor (1,000 XLM) should NOT be displayed
    expect(screen.queryByText("GIIG...Y3Z6")).not.toBeInTheDocument();
  });
});
