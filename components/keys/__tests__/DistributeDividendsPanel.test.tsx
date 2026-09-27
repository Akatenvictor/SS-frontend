import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { DistributeDividendsPanel } from "../DistributeDividendsPanel";
import * as api from "@/lib/api";

const toastSuccess = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ address: "GCREATORTEST", jwt: "jwt-token" }),
}));

vi.mock("@/hooks/useStellarWallet", () => ({
  useStellarWallet: () => ({ address: "GCREATORTEST" }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: vi.fn(),
  },
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
  toastSuccess.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DistributeDividendsPanel", () => {
  it("updates the per-key preview as the amount changes", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "fetchKeySupply").mockResolvedValue({
      circulatingSupply: 200,
      supplyCap: 1000,
      remainingMintable: 800,
    });

    renderWithClient(
      <DistributeDividendsPanel keyId="key-1" holdersCount={57} />
    );

    await waitFor(() => {
      expect(screen.getByTestId("dividend-holder-count")).toHaveTextContent(
        "200 keys circulating"
      );
    });

    await user.type(screen.getByTestId("dividend-amount-input"), "100");

    await waitFor(() => {
      expect(screen.getByTestId("dividend-per-key")).toHaveTextContent(
        "0.50 XLM"
      );
    });
  });

  it("displays the holder count below the preview", async () => {
    vi.spyOn(api, "fetchKeySupply").mockResolvedValue({
      circulatingSupply: 200,
      supplyCap: 1000,
      remainingMintable: 800,
    });

    renderWithClient(
      <DistributeDividendsPanel keyId="key-1" holdersCount={57} />
    );

    await waitFor(() => {
      expect(screen.getByTestId("dividend-holder-count")).toHaveTextContent(
        "57 holders"
      );
    });
  });

  it("disables submit when the amount is zero", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "fetchKeySupply").mockResolvedValue({
      circulatingSupply: 200,
      supplyCap: 1000,
      remainingMintable: 800,
    });

    renderWithClient(
      <DistributeDividendsPanel keyId="key-1" holdersCount={57} />
    );

    await waitFor(() => {
      expect(screen.getByTestId("dividend-submit")).toBeDisabled();
    });

    await user.type(screen.getByTestId("dividend-amount-input"), "0");
    expect(screen.getByTestId("dividend-submit")).toBeDisabled();
  });

  it("disables submit when circulating supply is zero", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "fetchKeySupply").mockResolvedValue({
      circulatingSupply: 0,
      supplyCap: 1000,
      remainingMintable: 1000,
    });

    renderWithClient(
      <DistributeDividendsPanel keyId="key-1" holdersCount={0} />
    );

    await waitFor(() => {
      expect(screen.getByTestId("dividend-no-supply")).toBeInTheDocument();
    });

    await user.type(screen.getByTestId("dividend-amount-input"), "100");
    expect(screen.getByTestId("dividend-submit")).toBeDisabled();
  });

  it("submits the distribution and shows totals in a success toast", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "fetchKeySupply").mockResolvedValue({
      circulatingSupply: 200,
      supplyCap: 1000,
      remainingMintable: 800,
    });
    const distributeSpy = vi
      .spyOn(api, "distributeDividend")
      .mockResolvedValue({
        totalDistributed: 100,
        perKeyAmount: 0.5,
        holderCount: 57,
      });

    renderWithClient(
      <DistributeDividendsPanel keyId="key-1" holdersCount={57} />
    );

    await waitFor(() => {
      expect(screen.getByTestId("dividend-amount-input")).toBeInTheDocument();
    });

    await user.type(screen.getByTestId("dividend-amount-input"), "100");

    await waitFor(() => {
      expect(screen.getByTestId("dividend-submit")).toBeEnabled();
    });
    await user.click(screen.getByTestId("dividend-submit"));

    await waitFor(() => {
      expect(distributeSpy).toHaveBeenCalledWith(
        "key-1",
        100,
        "GCREATORTEST",
        "jwt-token"
      );
    });

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith(
        "Distributed 100.00 XLM — 0.50 XLM per key"
      );
    });
  });
});
