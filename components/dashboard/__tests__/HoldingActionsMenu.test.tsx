import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HoldingActionsMenu } from "../HoldingActionsMenu";
import type { InvestmentPosition } from "@/lib/portfolio";

const burnMutateAsync = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ address: "GTESTADDRESS", jwt: null }),
}));

vi.mock("@/hooks/useStellarWallet", () => ({
  useStellarWallet: () => ({ address: "GTESTADDRESS" }),
}));

vi.mock("@/hooks/useCreatorKeys", () => ({
  useBurnCreatorKeyMutation: () => ({
    mutateAsync: burnMutateAsync,
    isPending: false,
  }),
  useTransferCreatorKeyMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

function makePosition(overrides: Partial<InvestmentPosition> = {}): InvestmentPosition {
  return {
    invoice_id: "inv-1",
    invoice_title: "Creator Key Position",
    committed_amount: 100,
    status: "active",
    key_id: "key-1",
    key_title: "Creator Key",
    quantity: 10,
    ...overrides,
  };
}

describe("HoldingActionsMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens the burn modal from the holding row action menu", async () => {
    const user = userEvent.setup();
    render(<HoldingActionsMenu position={makePosition()} />);

    await user.click(screen.getByTestId("holding-actions-key-1"));
    await user.click(await screen.findByTestId("burn-action-key-1"));

    expect(await screen.findByTestId("burn-confirm-input")).toBeInTheDocument();
    expect(screen.getByTestId("burn-confirm-button")).toBeDisabled();
  });

  it("disables the burn option when the holding balance is zero", async () => {
    const user = userEvent.setup();
    render(<HoldingActionsMenu position={makePosition({ quantity: 0 })} />);

    await user.click(screen.getByTestId("holding-actions-key-1"));

    expect(await screen.findByTestId("burn-action-key-1")).toHaveAttribute(
      "aria-disabled",
      "true"
    );
  });

  it("does not open the burn modal when the balance is zero", async () => {
    const user = userEvent.setup();
    render(<HoldingActionsMenu position={makePosition({ quantity: 0 })} />);

    await user.click(screen.getByTestId("holding-actions-key-1"));
    await user.click(await screen.findByTestId("burn-action-key-1"));

    expect(screen.queryByTestId("burn-confirm-input")).not.toBeInTheDocument();
  });
});
