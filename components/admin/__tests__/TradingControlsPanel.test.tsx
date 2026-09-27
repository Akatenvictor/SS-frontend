import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TradingControlsPanel } from "../TradingControlsPanel";
import type { AdminKeyControl } from "@/lib/api";

const useAdminKeyControls = vi.fn();
const proposeMutate = vi.fn();
const approveMutate = vi.fn();

const ADMIN_ADDRESS = "GADMINONE";
const OTHER_ADMIN = "GADMINTWO";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ address: ADMIN_ADDRESS, jwt: "jwt-token" }),
}));

vi.mock("@/hooks/useTradingPause", () => ({
  useAdminKeyControls: (...args: unknown[]) => useAdminKeyControls(...args),
  useProposePauseMutation: () => ({
    mutate: proposeMutate,
    isPending: false,
    variables: undefined,
  }),
  useApprovePauseMutation: () => ({
    mutate: approveMutate,
    isPending: false,
    variables: undefined,
  }),
}));

function mockControls(keys: AdminKeyControl[], overrides: Record<string, unknown> = {}) {
  useAdminKeyControls.mockReturnValue({
    data: { keys },
    isLoading: false,
    ...overrides,
  });
}

const activeKey: AdminKeyControl = {
  keyId: "key-1",
  keyTitle: "Alice Key",
  tradingStatus: "active",
  pendingProposal: null,
};

describe("TradingControlsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits a pause proposal from the Propose Pause button", async () => {
    const user = userEvent.setup();
    mockControls([activeKey]);

    render(<TradingControlsPanel />);
    await user.click(screen.getByTestId("propose-pause-key-1"));

    expect(proposeMutate).toHaveBeenCalledWith({
      keyId: "key-1",
      token: "jwt-token",
    });
  });

  it("shows a pending badge for keys with an open proposal", () => {
    mockControls([
      {
        ...activeKey,
        tradingStatus: "pause_pending",
        pendingProposal: {
          keyId: "key-1",
          proposedBy: OTHER_ADMIN,
          proposedAt: new Date().toISOString(),
        },
      },
    ]);

    render(<TradingControlsPanel />);

    expect(screen.getByTestId("pause-pending-badge-key-1")).toBeInTheDocument();
  });

  it("disables the approve button for the admin who proposed the pause", () => {
    mockControls([
      {
        ...activeKey,
        tradingStatus: "pause_pending",
        pendingProposal: {
          keyId: "key-1",
          proposedBy: ADMIN_ADDRESS,
          proposedAt: new Date().toISOString(),
        },
      },
    ]);

    render(<TradingControlsPanel />);

    expect(screen.getByTestId("approve-pause-key-1")).toBeDisabled();
    expect(screen.getByTestId("own-proposal-notice-key-1")).toHaveTextContent(
      "a second admin must approve it"
    );
  });

  it("lets a different admin approve the pending proposal", async () => {
    const user = userEvent.setup();
    mockControls([
      {
        ...activeKey,
        tradingStatus: "pause_pending",
        pendingProposal: {
          keyId: "key-1",
          proposedBy: OTHER_ADMIN,
          proposedAt: new Date().toISOString(),
        },
      },
    ]);

    render(<TradingControlsPanel />);
    const approveButton = screen.getByTestId("approve-pause-key-1");
    expect(approveButton).toBeEnabled();

    await user.click(approveButton);

    expect(approveMutate).toHaveBeenCalledWith({
      keyId: "key-1",
      token: "jwt-token",
    });
  });

  it("shows the Trading Paused badge once the key is paused", () => {
    mockControls([{ ...activeKey, tradingStatus: "paused" }]);

    render(<TradingControlsPanel />);

    expect(screen.getByTestId("trading-paused-badge-key-1")).toHaveTextContent(
      "Trading Paused"
    );
    expect(screen.queryByTestId("propose-pause-key-1")).not.toBeInTheDocument();
  });
});
