import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { VestingProgressWidget } from "../VestingProgressWidget";
import type { InvestmentPosition } from "@/lib/portfolio";
import * as api from "@/lib/api";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();

  return {
    ...actual,
    fetchVestingSchedule: vi.fn(),
    claimVestedKeys: vi.fn(),
  };
});

vi.mock("@/hooks/useStellarWallet", () => ({
  useStellarWallet: () => ({
    address: "GWALLET",
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const positions: InvestmentPosition[] = [
  {
    invoice_id: "inv-1",
    invoice_title: "Invoice",
    committed_amount: 100,
    status: "active",
    key_id: "key-1",
    key_title: "Founder Key",
    quantity: 5,
  },
];

describe("VestingProgressWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders vesting progress and claimable amount for held keys", async () => {
    vi.mocked(api.fetchVestingSchedule).mockResolvedValue({
      keyId: "key-1",
      keyTitle: "Founder Key",
      totalKeys: 10,
      vestedAmount: 4,
      claimableAmount: 2,
      startDate: "2026-01-01T00:00:00.000Z",
      endDate: "2026-12-31T00:00:00.000Z",
    });

    renderWithClient(<VestingProgressWidget positions={positions} />);

    expect(await screen.findByTestId("vesting-section")).toBeInTheDocument();
    expect(screen.getByText("Founder Key")).toBeInTheDocument();
    expect(screen.getByTestId("vesting-progress-key-1")).toHaveStyle({
      width: "40%",
    });
    expect(screen.getByTestId("claimable-key-1")).toHaveTextContent(
      "2 claimable"
    );
  });

  it("hides the section when no vesting schedules exist", async () => {
    vi.mocked(api.fetchVestingSchedule).mockResolvedValue(null);

    const { container } = renderWithClient(
      <VestingProgressWidget positions={positions} />
    );

    await waitFor(() =>
      expect(screen.queryByTestId("vesting-loading")).not.toBeInTheDocument()
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("triggers a claim and shows button loading state", async () => {
    vi.mocked(api.fetchVestingSchedule).mockResolvedValue({
      keyId: "key-1",
      keyTitle: "Founder Key",
      totalKeys: 10,
      vestedAmount: 5,
      claimableAmount: 1,
    });
    vi.mocked(api.claimVestedKeys).mockReturnValue(new Promise(() => {}));

    renderWithClient(<VestingProgressWidget positions={positions} />);

    const claimButton = await screen.findByTestId("claim-vested-key-1");
    fireEvent.click(claimButton);

    await waitFor(() =>
      expect(api.claimVestedKeys).toHaveBeenCalledWith(
        "key-1",
        "GWALLET",
        undefined
      )
    );
    await waitFor(() => expect(claimButton).toBeDisabled());
  });
});
