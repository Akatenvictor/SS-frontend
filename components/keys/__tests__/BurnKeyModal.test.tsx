import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BurnKeyModal } from "../BurnKeyModal";
import type { InvestmentPosition } from "@/lib/portfolio";

const mutateAsync = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    address: "GTESTADDRESS",
    jwt: null,
  }),
}));

vi.mock("@/hooks/useStellarWallet", () => ({
  useStellarWallet: () => ({
    address: "GTESTADDRESS",
  }),
}));

vi.mock("@/hooks/useCreatorKeys", () => ({
  useBurnCreatorKeyMutation: () => ({
    mutateAsync,
    isPending: false,
  }),
}));

const position: InvestmentPosition = {
  invoice_id: "inv-1",
  invoice_title: "Creator Key Position",
  committed_amount: 100,
  status: "active",
  key_id: "key-1",
  key_title: "Creator Key",
  quantity: 10,
};

async function openModal() {
  const user = userEvent.setup();
  render(<BurnKeyModal position={position} />);
  await user.click(screen.getByTestId("burn-button-key-1"));
  return user;
}

describe("BurnKeyModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("disables the confirm button on open", async () => {
    await openModal();
    expect(screen.getByTestId("burn-confirm-button")).toBeDisabled();
  });

  it("does not enable confirm when lowercase 'burn' is typed", async () => {
    const user = await openModal();
    await user.type(screen.getByTestId("burn-confirm-input"), "burn");
    expect(screen.getByTestId("burn-confirm-button")).toBeDisabled();
  });

  it("enables confirm when exact 'BURN' is typed", async () => {
    const user = await openModal();
    await user.type(screen.getByTestId("burn-confirm-input"), "BURN");
    expect(screen.getByTestId("burn-confirm-button")).toBeEnabled();
  });

  it("disables confirm again after clearing the input", async () => {
    const user = await openModal();
    const input = screen.getByTestId("burn-confirm-input");
    await user.type(input, "BURN");
    expect(screen.getByTestId("burn-confirm-button")).toBeEnabled();

    await user.clear(input);
    expect(screen.getByTestId("burn-confirm-button")).toBeDisabled();
  });

  it("shows an inline error and does not call the contract when quantity exceeds balance", async () => {
    const user = await openModal();
    const quantityInput = screen.getByTestId("burn-quantity-input");
    await user.clear(quantityInput);
    await user.type(quantityInput, "20");
    await user.type(screen.getByTestId("burn-confirm-input"), "BURN");

    expect(screen.getByTestId("burn-quantity-error")).toHaveTextContent(
      "Insufficient balance"
    );
    expect(screen.getByTestId("burn-confirm-button")).toBeDisabled();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("disables the trigger button when the held balance is zero", () => {
    render(<BurnKeyModal position={{ ...position, quantity: 0 }} />);
    expect(screen.getByTestId("burn-button-key-1")).toBeDisabled();
  });

  it("renders no trigger button and opens directly when controlled", () => {
    render(<BurnKeyModal position={position} open onOpenChange={() => {}} />);
    expect(screen.queryByTestId("burn-button-key-1")).not.toBeInTheDocument();
    expect(screen.getByTestId("burn-confirm-input")).toBeInTheDocument();
  });

  it("submits the burn with the entered quantity once BURN is typed", async () => {
    const user = await openModal();
    const quantityInput = screen.getByTestId("burn-quantity-input");
    await user.clear(quantityInput);
    await user.type(quantityInput, "4");
    await user.type(screen.getByTestId("burn-confirm-input"), "BURN");
    await user.click(screen.getByTestId("burn-confirm-button"));

    expect(mutateAsync).toHaveBeenCalledWith({
      quantity: 4,
      walletAddress: "GTESTADDRESS",
      token: null,
    });
  });
});
