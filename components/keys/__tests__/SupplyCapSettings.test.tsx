import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { SupplyCapSettings } from "../SupplyCapSettings";
import * as api from "@/lib/api";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ address: "GCREATORTEST", jwt: "jwt-token" }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
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

describe("SupplyCapSettings", () => {
  it("displays cap, circulating supply and remaining mintable", async () => {
    vi.spyOn(api, "fetchKeySupply").mockResolvedValue({
      circulatingSupply: 400,
      supplyCap: 1000,
      remainingMintable: 600,
    });

    renderWithClient(<SupplyCapSettings keyId="key-1" />);

    await waitFor(() => {
      expect(screen.getByTestId("supply-cap-settings")).toBeInTheDocument();
    });

    expect(screen.getByTestId("supply-cap-current")).toHaveTextContent("1,000");
    expect(screen.getByTestId("supply-cap-circulating")).toHaveTextContent("400");
    expect(screen.getByTestId("supply-cap-remaining")).toHaveTextContent("600");
  });

  it("prefills the input with the current cap", async () => {
    vi.spyOn(api, "fetchKeySupply").mockResolvedValue({
      circulatingSupply: 400,
      supplyCap: 1000,
      remainingMintable: 600,
    });

    renderWithClient(<SupplyCapSettings keyId="key-1" />);

    await waitFor(() => {
      expect(screen.getByTestId("supply-cap-input")).toHaveValue(1000);
    });
  });

  it("shows a 'No cap set' placeholder when supplyCap is null", async () => {
    vi.spyOn(api, "fetchKeySupply").mockResolvedValue({
      circulatingSupply: 250,
      supplyCap: null,
      remainingMintable: 0,
    });

    renderWithClient(<SupplyCapSettings keyId="key-1" />);

    await waitFor(() => {
      expect(screen.getByTestId("supply-cap-settings")).toBeInTheDocument();
    });

    expect(screen.getByTestId("supply-cap-input")).toHaveAttribute(
      "placeholder",
      "No cap set"
    );
    expect(screen.getByTestId("supply-cap-current")).toHaveTextContent(
      "No cap set"
    );
  });

  it("disables Save when the input is below circulating supply", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "fetchKeySupply").mockResolvedValue({
      circulatingSupply: 400,
      supplyCap: 1000,
      remainingMintable: 600,
    });

    renderWithClient(<SupplyCapSettings keyId="key-1" />);

    await waitFor(() => {
      expect(screen.getByTestId("supply-cap-input")).toHaveValue(1000);
    });

    const input = screen.getByTestId("supply-cap-input");
    await user.clear(input);
    await user.type(input, "399");

    expect(screen.getByTestId("supply-cap-save")).toBeDisabled();
    expect(
      screen.getByTestId("supply-cap-validation-error")
    ).toBeInTheDocument();
  });

  it("enables Save and refreshes stats after a successful update", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi
      .spyOn(api, "fetchKeySupply")
      .mockResolvedValueOnce({
        circulatingSupply: 400,
        supplyCap: 1000,
        remainingMintable: 600,
      })
      .mockResolvedValue({
        circulatingSupply: 400,
        supplyCap: 2000,
        remainingMintable: 1600,
      });

    const updateSpy = vi.spyOn(api, "updateKeySupplyCap").mockResolvedValue({
      circulatingSupply: 400,
      supplyCap: 2000,
      remainingMintable: 1600,
    });

    renderWithClient(<SupplyCapSettings keyId="key-1" />);

    await waitFor(() => {
      expect(screen.getByTestId("supply-cap-input")).toHaveValue(1000);
    });

    const input = screen.getByTestId("supply-cap-input");
    await user.clear(input);
    await user.type(input, "2000");

    const save = screen.getByTestId("supply-cap-save");
    expect(save).toBeEnabled();
    await user.click(save);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith("key-1", 2000, "jwt-token");
    });

    await waitFor(() => {
      expect(screen.getByTestId("supply-cap-current")).toHaveTextContent("2,000");
    });
    expect(fetchSpy.mock.calls.length).toBeGreaterThan(1);
  });

  it("shows a 409 conflict from the server as an inline error", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "fetchKeySupply").mockResolvedValue({
      circulatingSupply: 400,
      supplyCap: 1000,
      remainingMintable: 600,
    });

    const conflict = new Error(
      "Supply cap conflicts with the current circulating supply"
    ) as api.ApiConflictError;
    conflict.name = "ApiConflictError";
    conflict.isConflict = true;
    vi.spyOn(api, "updateKeySupplyCap").mockRejectedValue(conflict);

    renderWithClient(<SupplyCapSettings keyId="key-1" />);

    await waitFor(() => {
      expect(screen.getByTestId("supply-cap-input")).toHaveValue(1000);
    });

    const input = screen.getByTestId("supply-cap-input");
    await user.clear(input);
    await user.type(input, "2000");
    await user.click(screen.getByTestId("supply-cap-save"));

    await waitFor(() => {
      expect(screen.getByTestId("supply-cap-conflict-error")).toHaveTextContent(
        "Supply cap conflicts with the current circulating supply"
      );
    });
  });
});
