import { describe, it, expect, vi, beforeEach } from "vitest";
import { useState, useCallback } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PositionTransferModal } from "../PositionTransferModal";
import type { InvestmentPosition } from "@/lib/portfolio";

// Valid Ed25519 Stellar public keys (StrKey.isValidEd25519PublicKey checks a
// real base32 checksum, not just shape) — generated once for these tests,
// hold no funds, and are not used anywhere real.
const VALID_BUYER = "GDANW55RBL4AM5BLGIJG4G6PLZDPAJ75V4RWNG7HCN5C44CG5X5CZLTS";
const SELLER_ADDRESS = "GBEH6X5KIRWHDNE5J6SRAS4KDMXDXTKKZNQAAK23WP4SKN55HRBMPISR";

const mutateAsyncImpl = vi.fn();

// A minimal but *reactive* stand-in for useMutation: mutateAsyncImpl is the
// per-test-controllable mock; this wrapper mirrors React Query's real
// isPending/isError state transitions (via real useState) so the component
// under test re-renders exactly as it would with the real hook.
vi.mock("@/hooks/useInvestments", () => ({
  useTransferPositionMutation: () => {
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
  useAuth: () => ({ address: SELLER_ADDRESS, jwt: "test-jwt" }),
}));

vi.mock("@/hooks/useStellarWallet", () => ({
  useStellarWallet: () => ({ address: null }),
}));

function makePosition(overrides: Partial<InvestmentPosition> = {}): InvestmentPosition {
  return {
    invoice_id: "inv-1",
    invoice_title: "Acme receivable",
    committed_amount: 3000,
    status: "active",
    ...overrides,
  };
}

async function openModal() {
  fireEvent.click(screen.getByTestId("transfer-position-button-inv-1"));
}

describe("PositionTransferModal (issue #115)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows an inline error and disables confirm for an invalid Stellar address", async () => {
    render(<PositionTransferModal position={makePosition()} />);
    await openModal();

    fireEvent.change(screen.getByTestId("transfer-position-buyer-input"), {
      target: { value: "not-a-valid-address" },
    });
    fireEvent.change(screen.getByTestId("transfer-position-price-input"), {
      target: { value: "100" },
    });

    expect(screen.getByTestId("transfer-position-error")).toHaveTextContent(
      "Invalid Stellar address"
    );
    expect(screen.getByTestId("transfer-position-confirm-button")).toBeDisabled();
  });

  it("shows 'Cannot transfer to yourself' when the buyer is the seller's own address", async () => {
    render(<PositionTransferModal position={makePosition()} />);
    await openModal();

    fireEvent.change(screen.getByTestId("transfer-position-buyer-input"), {
      target: { value: SELLER_ADDRESS },
    });
    fireEvent.change(screen.getByTestId("transfer-position-price-input"), {
      target: { value: "100" },
    });

    expect(screen.getByTestId("transfer-position-error")).toHaveTextContent(
      "Cannot transfer to yourself"
    );
    expect(screen.getByTestId("transfer-position-confirm-button")).toBeDisabled();
  });

  it("enables confirm for a valid address and a positive sale price", async () => {
    render(<PositionTransferModal position={makePosition()} />);
    await openModal();

    fireEvent.change(screen.getByTestId("transfer-position-buyer-input"), {
      target: { value: VALID_BUYER },
    });
    fireEvent.change(screen.getByTestId("transfer-position-price-input"), {
      target: { value: "250.5" },
    });

    expect(screen.queryByTestId("transfer-position-error")).not.toBeInTheDocument();
    expect(screen.getByTestId("transfer-position-confirm-button")).not.toBeDisabled();
    expect(screen.getByTestId("transfer-position-proceeds")).toHaveTextContent(
      "250.50 XLM"
    );
  });

  it("shows the position amount being transferred before confirming", async () => {
    render(<PositionTransferModal position={makePosition({ committed_amount: 4200 })} />);
    await openModal();

    expect(screen.getByTestId("transfer-position-amount")).toHaveTextContent(
      "4,200.00 XLM"
    );
  });

  it("calls the contract with the correct invoice_id, buyer, and sale price on confirm", async () => {
    mutateAsyncImpl.mockResolvedValue({ success: true });
    render(<PositionTransferModal position={makePosition({ invoice_id: "inv-42" })} />);
    fireEvent.click(screen.getByTestId("transfer-position-button-inv-42"));

    fireEvent.change(screen.getByTestId("transfer-position-buyer-input"), {
      target: { value: VALID_BUYER },
    });
    fireEvent.change(screen.getByTestId("transfer-position-price-input"), {
      target: { value: "500" },
    });

    fireEvent.click(screen.getByTestId("transfer-position-confirm-button"));

    await waitFor(() => {
      expect(mutateAsyncImpl).toHaveBeenCalledWith({
        invoiceId: "inv-42",
        buyer: VALID_BUYER,
        salePriceXlm: 500,
        walletAddress: SELLER_ADDRESS,
        token: "test-jwt",
      });
    });
  });

  it("shows an error and re-enables confirm when the contract call fails", async () => {
    mutateAsyncImpl.mockRejectedValue(new Error("contract call failed"));
    render(<PositionTransferModal position={makePosition()} />);
    await openModal();

    fireEvent.change(screen.getByTestId("transfer-position-buyer-input"), {
      target: { value: VALID_BUYER },
    });
    fireEvent.change(screen.getByTestId("transfer-position-price-input"), {
      target: { value: "500" },
    });

    fireEvent.click(screen.getByTestId("transfer-position-confirm-button"));

    await waitFor(() => {
      expect(screen.getByTestId("transfer-position-submit-error")).toHaveTextContent(
        "Failed to transfer position"
      );
    });
    expect(screen.getByTestId("transfer-position-confirm-button")).not.toBeDisabled();
  });
});
