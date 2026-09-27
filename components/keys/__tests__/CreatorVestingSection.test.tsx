import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { CreatorVestingSection } from "../CreatorVestingSection";
import * as api from "@/lib/api";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    address: "GCREATORTEST",
    jwt: null,
  }),
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

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CreatorVestingSection", () => {
  it("renders nothing when the creator has no vesting schedule", async () => {
    vi.spyOn(api, "fetchVestingSchedule").mockResolvedValue(null);
    const { container } = renderWithClient(<CreatorVestingSection keyId="key-1" />);

    await waitFor(() => {
      expect(container.querySelector('[data-testid="creator-vesting-loading"]')).toBeNull();
    });
    expect(screen.queryByTestId("creator-vesting-section")).not.toBeInTheDocument();
  });

  it("displays vesting stats and disables claim when claimable is zero", async () => {
    vi.spyOn(api, "fetchVestingSchedule").mockResolvedValue({
      keyId: "key-1",
      keyTitle: "Creator Key",
      totalKeys: 1000,
      vestedAmount: 400,
      claimedAmount: 400,
      claimableAmount: 0,
      startDate: "2026-01-01",
      endDate: "2027-01-01",
      vestingEndsAt: "2027-01-01",
    });

    renderWithClient(<CreatorVestingSection keyId="key-1" />);

    await waitFor(() => {
      expect(screen.getByTestId("creator-vesting-section")).toBeInTheDocument();
    });

    expect(screen.getByTestId("creator-vesting-progress")).toHaveStyle({ width: "40%" });
    expect(screen.getByTestId("creator-vesting-claimed")).toHaveTextContent("400 claimed");
    expect(screen.getByTestId("creator-vesting-claimable")).toHaveTextContent("0 claimable");
    expect(screen.getByTestId("creator-claim-vested")).toBeDisabled();
  });

  it("enables the claim button when claimable amount is greater than zero", async () => {
    vi.spyOn(api, "fetchVestingSchedule").mockResolvedValue({
      keyId: "key-1",
      totalKeys: 1000,
      vestedAmount: 400,
      claimedAmount: 100,
      claimableAmount: 300,
      startDate: null,
      endDate: null,
      vestingEndsAt: null,
    });

    renderWithClient(<CreatorVestingSection keyId="key-1" />);

    await waitFor(() => {
      expect(screen.getByTestId("creator-claim-vested")).toBeEnabled();
    });
  });
});
