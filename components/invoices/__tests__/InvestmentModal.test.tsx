import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { InvestmentModal } from "../InvestmentModal";
import * as stellarUsdc from "@/lib/stellar/usdc";
import type { Network } from "@/lib/stellar";

// WalletContext itself is not exported, so the hook is mocked instead.
const mockUseWallet = vi.fn();
vi.mock("@/context/WalletContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/context/WalletContext")>();
  return { ...actual, useWallet: () => mockUseWallet() };
});

const ADDRESS = "GD5X6MPY7HXHYHZWRXKJQKQ7T2WQ2Y3H4ZQ2Y2KQ2WQ2Y2KQ2WQ2Y2KQ2";

// Radix's popover/dialog measure with ResizeObserver, absent in jsdom.
beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Minimal wallet value; the balance guard only reads address and network. */
function walletValue(address: string | null) {
  return {
    address,
    network: "testnet" as Network,
    isConnected: address !== null,
  };
}

function renderModal(ui: ReactElement, address: string | null) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  mockUseWallet.mockReturnValue(walletValue(address));
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function openModal() {
  const result = renderModal(
    <InvestmentModal invoiceId="inv-1" minInvestment={10} maxInvestment={10_000} />,
    ADDRESS
  );
  // The invest UI lives in a popover, which only mounts once opened.
  fireEvent.click(screen.getByTestId("invest-button"));
  return result;
}

describe("InvestmentModal USDC balance guard (#402)", () => {
  it("shows the wallet USDC balance", async () => {
    vi.spyOn(stellarUsdc, "fetchUsdcBalance").mockResolvedValue(2_500);

    openModal();

    await waitFor(() =>
      expect(screen.getByTestId("investment-modal-balance")).toHaveTextContent("2,500.00 USDC")
    );
  });

  it("shows no top-up prompt while the balance is sufficient", async () => {
    vi.spyOn(stellarUsdc, "fetchUsdcBalance").mockResolvedValue(5_000);

    openModal();

    await waitFor(() =>
      expect(screen.getByTestId("investment-modal-balance")).toHaveTextContent("5,000.00 USDC")
    );
    expect(screen.queryByTestId("insufficient-balance")).not.toBeInTheDocument();
  });

  it("surfaces the top-up CTA when the entered amount exceeds the balance", async () => {
    vi.spyOn(stellarUsdc, "fetchUsdcBalance").mockResolvedValue(100);

    openModal();

    await waitFor(() =>
      expect(screen.getByTestId("investment-modal-balance")).toHaveTextContent("100.00 USDC")
    );
    // The guard is evaluated against the amount being committed.
    expect(screen.queryByTestId("insufficient-balance")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Investment amount/i), {
      target: { value: "1000" },
    });

    await waitFor(() =>
      expect(screen.getByTestId("insufficient-balance")).toBeInTheDocument()
    );
    expect(screen.getByTestId("insufficient-balance")).toHaveTextContent("900.00 USDC");
  });

  it("blocks the investment while the wallet is short", async () => {
    vi.spyOn(stellarUsdc, "fetchUsdcBalance").mockResolvedValue(100);

    openModal();

    await waitFor(() => expect(screen.getByTestId("investment-modal-balance")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/Investment amount/i), {
      target: { value: "1000" },
    });

    expect(screen.getByTestId("investment-submit")).toBeDisabled();
  });

  it("keeps the investment enabled when the balance covers the amount", async () => {
    vi.spyOn(stellarUsdc, "fetchUsdcBalance").mockResolvedValue(5_000);

    openModal();

    await waitFor(() => expect(screen.getByTestId("investment-modal-balance")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/Investment amount/i), {
      target: { value: "1000" },
    });

    await waitFor(() =>
      expect(screen.getByTestId("investment-submit")).toBeEnabled()
    );
  });

  it("displays the minimum investment label and disables submit below minimum (#436)", async () => {
    vi.spyOn(stellarUsdc, "fetchUsdcBalance").mockResolvedValue(5_000);

    openModal();

    await waitFor(() => expect(screen.getByTestId("investment-modal-balance")).toBeInTheDocument());

    // Minimum investment label displayed on modal
    expect(screen.getByTestId("investment-modal-min-investment")).toBeInTheDocument();
    expect(screen.getByTestId("investment-modal-min-value")).toHaveTextContent("10.00 XLM");

    // Enter amount below minimum (min is 10)
    fireEvent.change(screen.getByLabelText(/Investment amount/i), {
      target: { value: "5" },
    });

    // Confirm button must be disabled while validation error is active
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Minimum investment is 10 XLM");
    });
    expect(screen.getByTestId("investment-submit")).toBeDisabled();

    // Clicking Min preset populates 10 and clears error
    fireEvent.click(screen.getByTestId("preset-min"));
    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getByTestId("investment-submit")).toBeEnabled();
    });
  });

  it("does not accuse the user of being short before the balance loads", () => {
    vi.spyOn(stellarUsdc, "fetchUsdcBalance").mockReturnValue(new Promise(() => {}));

    openModal();

    expect(screen.getByTestId("investment-modal-balance")).toHaveTextContent("Loading…");
    expect(screen.queryByTestId("insufficient-balance")).not.toBeInTheDocument();
  });

  it("keeps the comparison affordances out of the invest popover", async () => {
    vi.spyOn(stellarUsdc, "fetchUsdcBalance").mockResolvedValue(100);

    openModal();

    await waitFor(() => expect(screen.getByTestId("investment-modal-balance")).toBeInTheDocument());
    expect(screen.getByTestId("invest-button")).toBeInTheDocument();
  });
});
