import { describe, it, expect, vi, beforeEach } from "vitest";
import { useState, useCallback } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FractionTransferModal } from "../FractionTransferModal";
import type { InvestmentPosition } from "@/lib/portfolio";

// Valid ed25519 public keys — StrKey checks a real base58 checksum, not just
// shape, so hand-typed addresses fail. Generated for these tests, hold nothing.
const RECIPIENT = "GDANW55RBL4AM5BLGIJG4G6PLZDPAJ75V4RWNG7HCN5C44CG5X5CZLTS";
const OTHER_RECIPIENT = "GBEH6X5KIRWHDNE5J6SRAS4KDMXDXTKKZNQAAK23WP4SKN55HRBMPISR";
const SENDER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const TX_HASH = "a".repeat(64);

const mutateAsyncImpl = vi.fn();

// Reactive stand-in for useMutation: mirrors React Query's isPending/isError
// transitions through real useState so the component re-renders as it would
// with the real hook. Same approach as PositionTransferModal.test.tsx.
vi.mock("@/hooks/useInvestments", () => ({
  useTransferFractionsMutation: () => {
    const [isPending, setIsPending] = useState(false);
    const [isError, setIsError] = useState(false);
    const mutateAsync = useCallback(async (vars: unknown) => {
      setIsPending(true);
      setIsError(false);
      try {
        const result = await mutateAsyncImpl(vars);
        setIsPending(false);
        return result;
      } catch (err) {
        setIsPending(false);
        setIsError(true);
        throw err;
      }
    }, []);
    return { mutateAsync, isPending, isError };
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ address: SENDER, jwt: "test-jwt" }),
}));

vi.mock("@/hooks/useStellarWallet", () => ({
  useStellarWallet: () => ({ address: null, network: "testnet" }),
}));

function makePosition(overrides: Partial<InvestmentPosition> = {}): InvestmentPosition {
  return {
    invoice_id: "inv-1",
    invoice_title: "Acme receivable",
    committed_amount: 3000,
    status: "active",
    quantity: 100,
    ...overrides,
  };
}

function renderModal(position = makePosition()) {
  return render(<FractionTransferModal position={position} />);
}

function openModal() {
  fireEvent.click(screen.getByTestId("transfer-fractions-button-inv-1"));
}

function fillForm({ address = RECIPIENT, quantity = "10" } = {}) {
  fireEvent.change(screen.getByTestId("fraction-transfer-recipient-input"), {
    target: { value: address },
  });
  fireEvent.change(screen.getByTestId("fraction-transfer-quantity-input"), {
    target: { value: quantity },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mutateAsyncImpl.mockResolvedValue({ success: true, transaction_hash: TX_HASH });
});

describe("transfer trigger on a holding", () => {
  it("renders a transfer button for the holding", () => {
    renderModal();
    expect(
      screen.getByTestId("transfer-fractions-button-inv-1")
    ).toBeInTheDocument();
  });

  it("opens the modal on click", () => {
    renderModal();
    openModal();
    expect(screen.getByTestId("fraction-transfer-modal")).toBeInTheDocument();
  });

  it("shows the holding's title so the user knows what they are sending from", () => {
    renderModal();
    openModal();
    expect(screen.getAllByText("Acme receivable").length).toBeGreaterThan(0);
  });

  it("disables the button when every fraction is listed for sale", () => {
    renderModal(makePosition({ quantity: 100, listed_quantity: 100 }));
    expect(screen.getByTestId("transfer-fractions-button-inv-1")).toBeDisabled();
  });

  it("keeps the button enabled when some fractions are still free", () => {
    renderModal(makePosition({ quantity: 100, listed_quantity: 30 }));
    expect(screen.getByTestId("transfer-fractions-button-inv-1")).toBeEnabled();
  });
});

describe("available balance", () => {
  it("shows the full balance when nothing is listed", () => {
    renderModal(makePosition({ quantity: 100, listed_quantity: 0 }));
    openModal();
    expect(screen.getByTestId("transfer-available-fractions")).toHaveTextContent(
      "100 of 100"
    );
  });

  it("subtracts listed fractions from the transferable balance", () => {
    renderModal(makePosition({ quantity: 100, listed_quantity: 30 }));
    openModal();
    expect(screen.getByTestId("transfer-available-fractions")).toHaveTextContent(
      "70 of 100"
    );
  });

  it("explains that listed fractions are committed to a sale", () => {
    renderModal(makePosition({ quantity: 100, listed_quantity: 30 }));
    openModal();
    expect(screen.getByText(/listed for sale/i)).toBeInTheDocument();
  });
});

describe("address validation", () => {
  it("accepts a valid Stellar address with no error", () => {
    renderModal();
    openModal();
    fireEvent.change(screen.getByTestId("fraction-transfer-recipient-input"), {
      target: { value: RECIPIENT },
    });
    expect(
      screen.queryByTestId("fraction-transfer-recipient-error")
    ).not.toBeInTheDocument();
  });

  it("rejects a malformed address and names the problem", () => {
    renderModal();
    openModal();
    fireEvent.change(screen.getByTestId("fraction-transfer-recipient-input"), {
      target: { value: "not-a-stellar-address" },
    });
    expect(screen.getByTestId("fraction-transfer-recipient-error")).toHaveTextContent(
      /start with G/i
    );
  });

  it("rejects a bad checksum, which a shape check alone would pass", () => {
    renderModal();
    openModal();
    fireEvent.change(screen.getByTestId("fraction-transfer-recipient-input"), {
      target: { value: `${RECIPIENT.slice(0, -1)}X` },
    });
    expect(screen.getByTestId("fraction-transfer-recipient-error")).toHaveTextContent(
      "Invalid Stellar address"
    );
  });

  it("rejects a contract address with a message that says why", () => {
    renderModal();
    openModal();
    fireEvent.change(screen.getByTestId("fraction-transfer-recipient-input"), {
      target: { value: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" },
    });
    expect(screen.getByTestId("fraction-transfer-recipient-error")).toHaveTextContent(
      /contract address/i
    );
  });

  it("does not warn on a blank field before the user has typed", () => {
    renderModal();
    openModal();
    expect(
      screen.queryByTestId("fraction-transfer-recipient-error")
    ).not.toBeInTheDocument();
  });

  it("refuses a transfer back to the sender's own address", () => {
    renderModal();
    openModal();
    fillForm({ address: SENDER });
    expect(screen.getByTestId("fraction-transfer-self-error")).toBeInTheDocument();
    expect(screen.getByTestId("fraction-transfer-confirm")).toBeDisabled();
  });

  it("keeps confirm disabled until the address is valid", () => {
    renderModal();
    openModal();
    fillForm({ address: "nonsense" });
    expect(screen.getByTestId("fraction-transfer-confirm")).toBeDisabled();
  });
});

describe("quantity validation", () => {
  it("caps the quantity at the available unlisted balance", () => {
    renderModal(makePosition({ quantity: 100, listed_quantity: 30 }));
    openModal();
    fireEvent.change(screen.getByTestId("fraction-transfer-quantity-input"), {
      target: { value: "71" },
    });
    expect(screen.getByTestId("fraction-transfer-quantity-error")).toHaveTextContent(
      "You can transfer at most 70 fractions"
    );
    expect(screen.getByTestId("fraction-transfer-confirm")).toBeDisabled();
  });

  it("allows the exact available balance", () => {
    renderModal(makePosition({ quantity: 100, listed_quantity: 30 }));
    openModal();
    fillForm({ quantity: "70" });
    expect(
      screen.queryByTestId("fraction-transfer-quantity-error")
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("fraction-transfer-confirm")).toBeEnabled();
  });

  it("explains when everything is listed", () => {
    const { rerender } = renderModal(
      makePosition({ quantity: 100, listed_quantity: 90 })
    );
    openModal();

    // The balance can empty underneath an open modal — the portfolio refetches
    // every 60s and a concurrent listing can take the last free fractions. The
    // trigger is disabled at zero, so this state is only reachable this way.
    rerender(<FractionTransferModal position={makePosition({ quantity: 100, listed_quantity: 100 })} />);

    fireEvent.change(screen.getByTestId("fraction-transfer-quantity-input"), {
      target: { value: "1" },
    });
    expect(screen.getByTestId("fraction-transfer-quantity-error")).toHaveTextContent(
      /cannot be transferred/i
    );
    expect(screen.getByTestId("fraction-transfer-confirm")).toBeDisabled();
  });

  it("rejects zero and negative quantities", () => {
    renderModal();
    openModal();
    fireEvent.change(screen.getByTestId("fraction-transfer-quantity-input"), {
      target: { value: "0" },
    });
    expect(screen.getByTestId("fraction-transfer-quantity-error")).toBeInTheDocument();
    expect(screen.getByTestId("fraction-transfer-confirm")).toBeDisabled();
  });

  it("rejects a fractional quantity, since fractions are indivisible", () => {
    renderModal();
    openModal();
    fillForm({ quantity: "1.5" });
    expect(screen.getByTestId("fraction-transfer-quantity-error")).toHaveTextContent(
      /whole number/i
    );
  });

  it("keeps confirm disabled with an empty quantity", () => {
    renderModal();
    openModal();
    fillForm({ quantity: "" });
    expect(screen.getByTestId("fraction-transfer-confirm")).toBeDisabled();
  });

  it("fills the available balance from the Max shortcut", () => {
    renderModal(makePosition({ quantity: 100, listed_quantity: 30 }));
    openModal();
    fireEvent.click(screen.getByTestId("fraction-transfer-max-btn"));
    expect(screen.getByTestId("fraction-transfer-quantity-input")).toHaveValue(70);
  });
});

describe("submitting the transfer", () => {
  it("submits the invoice, recipient, quantity and sender", async () => {
    renderModal();
    openModal();
    fillForm({ address: RECIPIENT, quantity: "25" });
    fireEvent.click(screen.getByTestId("fraction-transfer-confirm"));

    await waitFor(() => expect(mutateAsyncImpl).toHaveBeenCalledTimes(1));
    expect(mutateAsyncImpl).toHaveBeenCalledWith({
      invoiceId: "inv-1",
      recipient: RECIPIENT,
      quantity: 25,
      walletAddress: SENDER,
      token: "test-jwt",
    });
  });

  it("trims whitespace off the pasted address", async () => {
    renderModal();
    openModal();
    fillForm({ address: `  ${RECIPIENT}  ` });
    fireEvent.click(screen.getByTestId("fraction-transfer-confirm"));

    await waitFor(() => expect(mutateAsyncImpl).toHaveBeenCalledTimes(1));
    expect(mutateAsyncImpl.mock.calls[0][0].recipient).toBe(RECIPIENT);
  });

  it("sends a number, not the string the input produced", async () => {
    renderModal();
    openModal();
    fillForm({ quantity: "25" });
    fireEvent.click(screen.getByTestId("fraction-transfer-confirm"));

    await waitFor(() => expect(mutateAsyncImpl).toHaveBeenCalledTimes(1));
    expect(mutateAsyncImpl.mock.calls[0][0].quantity).toBe(25);
  });

  it("does not submit an invalid form", async () => {
    renderModal();
    openModal();
    fillForm({ address: "nonsense", quantity: "25" });
    fireEvent.click(screen.getByTestId("fraction-transfer-confirm"));

    await Promise.resolve();
    expect(mutateAsyncImpl).not.toHaveBeenCalled();
  });
});

describe("success state", () => {
  it("shows the transaction hash with an explorer link", async () => {
    renderModal();
    openModal();
    fillForm({ quantity: "25" });
    fireEvent.click(screen.getByTestId("fraction-transfer-confirm"));

    const link = await screen.findByTestId("fraction-transfer-tx-link");
    expect(link).toHaveTextContent(TX_HASH);
    expect(link).toHaveAttribute(
      "href",
      `https://stellar.expert/explorer/testnet/tx/${TX_HASH}`
    );
  });

  it("opens the explorer in a new tab, safely", async () => {
    renderModal();
    openModal();
    fillForm({ quantity: "25" });
    fireEvent.click(screen.getByTestId("fraction-transfer-confirm"));

    const link = await screen.findByTestId("fraction-transfer-tx-link");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("shows the updated balance left after the transfer", async () => {
    renderModal(makePosition({ quantity: 100 }));
    openModal();
    fillForm({ quantity: "25" });
    fireEvent.click(screen.getByTestId("fraction-transfer-confirm"));

    expect(await screen.findByTestId("fraction-transfer-remaining")).toHaveTextContent(
      "75"
    );
  });

  it("accounts for listed fractions in the post-transfer balance", async () => {
    renderModal(makePosition({ quantity: 100, listed_quantity: 30 }));
    openModal();
    fillForm({ quantity: "25" });
    fireEvent.click(screen.getByTestId("fraction-transfer-confirm"));

    // 70 transferable less the 25 just sent.
    expect(await screen.findByTestId("fraction-transfer-remaining")).toHaveTextContent(
      "45"
    );
  });

  it("does not report success when the response carries no transaction hash", async () => {
    mutateAsyncImpl.mockResolvedValue({ success: true });
    renderModal();
    openModal();
    fillForm({ quantity: "25" });
    fireEvent.click(screen.getByTestId("fraction-transfer-confirm"));

    // A 2xx with no hash is not a confirmed transfer the user can verify, so
    // the success state is withheld rather than shown without a receipt.
    expect(
      await screen.findByTestId("fraction-transfer-no-receipt-error")
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("fraction-transfer-success")
    ).not.toBeInTheDocument();
  });

  it("leaves the form on submit failure so the user can retry", async () => {
    mutateAsyncImpl.mockRejectedValue(new Error("boom"));
    renderModal();
    openModal();
    fillForm({ quantity: "25" });
    fireEvent.click(screen.getByTestId("fraction-transfer-confirm"));

    expect(await screen.findByTestId("fraction-transfer-submit-error")).toBeInTheDocument();
    expect(screen.getByTestId("fraction-transfer-recipient-input")).toHaveValue(
      RECIPIENT
    );
    expect(
      screen.queryByTestId("fraction-transfer-success")
    ).not.toBeInTheDocument();
  });
});

describe("closing the modal", () => {
  it("closes without transferring when cancelled", async () => {
    renderModal();
    openModal();
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() =>
      expect(screen.queryByTestId("fraction-transfer-modal")).not.toBeInTheDocument()
    );
    expect(mutateAsyncImpl).not.toHaveBeenCalled();
  });

  it("clears the entered values so a reopen starts fresh", async () => {
    renderModal();
    openModal();
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(screen.queryByTestId("fraction-transfer-modal")).not.toBeInTheDocument()
    );
    openModal();

    expect(screen.getByTestId("fraction-transfer-recipient-input")).toHaveValue("");
    // A number input's empty value reads as null through toHaveValue, so the
    // raw property is the honest assertion here.
    expect(
      (screen.getByTestId("fraction-transfer-quantity-input") as HTMLInputElement).value
    ).toBe("");
  });

  it("closes the success state on Done", async () => {
    renderModal();
    openModal();
    fillForm({ quantity: "25" });
    fireEvent.click(screen.getByTestId("fraction-transfer-confirm"));
    await screen.findByTestId("fraction-transfer-success");

    fireEvent.click(screen.getByTestId("fraction-transfer-done"));
    expect(
      screen.queryByTestId("fraction-transfer-success")
    ).not.toBeInTheDocument();
  });

  it("does not open a second modal while one is already open", () => {
    renderModal();
    openModal();
    expect(screen.getAllByTestId("fraction-transfer-modal")).toHaveLength(1);
  });
});
