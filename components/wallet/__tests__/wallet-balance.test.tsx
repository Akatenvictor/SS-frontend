import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { UsdcBalanceChip } from "../UsdcBalanceChip";
import { TopUpDialog } from "../TopUpDialog";
import { TopUpCta } from "../TopUpCta";
import * as stellarUsdc from "@/lib/stellar/usdc";

const ADDRESS = "GD5X6MPY7HXHYHZWRXKJQKQ7T2WQ2Y3H4ZQ2Y2KQ2WQ2Y2KQ2WQ2Y2KQ2";

function renderWithClient(ui: ReactElement) {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe("UsdcBalanceChip", () => {
    it("displays the balance fetched from Horizon", async () => {
        vi.spyOn(stellarUsdc, "fetchUsdcBalance").mockResolvedValue(1250.5);

        renderWithClient(<UsdcBalanceChip address={ADDRESS} network="testnet" />);

        expect(await screen.findByTestId("usdc-balance")).toHaveTextContent("1,250.50 USDC");
    });

    it("formats a zero balance rather than showing nothing", async () => {
        vi.spyOn(stellarUsdc, "fetchUsdcBalance").mockResolvedValue(0);

        renderWithClient(<UsdcBalanceChip address={ADDRESS} network="testnet" />);

        expect(await screen.findByTestId("usdc-balance")).toHaveTextContent("0.00 USDC");
    });

    it("requests the balance for the connected network's USDC asset", async () => {
        const spy = vi.spyOn(stellarUsdc, "fetchUsdcBalance").mockResolvedValue(10);

        renderWithClient(<UsdcBalanceChip address={ADDRESS} network="mainnet" />);

        await waitFor(() => expect(spy).toHaveBeenCalledWith(ADDRESS, "mainnet"));
    });

    it("shows a placeholder while the balance loads", () => {
        vi.spyOn(stellarUsdc, "fetchUsdcBalance").mockReturnValue(new Promise(() => {}));

        renderWithClient(<UsdcBalanceChip address={ADDRESS} network="testnet" />);

        expect(screen.getByTestId("usdc-balance-loading")).toBeInTheDocument();
    });

    it("shows an unavailable state when Horizon fails", async () => {
        vi.spyOn(stellarUsdc, "fetchUsdcBalance").mockRejectedValue(new Error("boom"));

        renderWithClient(<UsdcBalanceChip address={ADDRESS} network="testnet" />);

        expect(await screen.findByTestId("usdc-balance-error")).toBeInTheDocument();
    });

    it("refetches on the 60 second interval", async () => {
        const spy = vi.spyOn(stellarUsdc, "fetchUsdcBalance").mockResolvedValue(500);

        renderWithClient(<UsdcBalanceChip address={ADDRESS} network="testnet" />);
        await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));

        await act(async () => {
            vi.advanceTimersByTime(60_000);
        });

        await waitFor(() => expect(spy.mock.calls.length).toBeGreaterThan(1));
    });
});

describe("TopUpDialog", () => {
    it("renders a QR code carrying the wallet address", async () => {
        renderWithClient(<TopUpDialog address={ADDRESS} />);

        fireEvent.click(screen.getByTestId("open-top-up"));

        const qr = await screen.findByTestId("top-up-qr");
        expect(qr).toBeInTheDocument();
        const svg = qr.querySelector("svg");
        expect(svg).not.toBeNull();
        expect(svg).toHaveAttribute("viewBox", expect.stringContaining("0 0"));
    });

    it("shows the wallet address for manual entry", async () => {
        renderWithClient(<TopUpDialog address={ADDRESS} />);

        fireEvent.click(screen.getByTestId("open-top-up"));

        expect(await screen.findByTestId("top-up-address")).toHaveTextContent(ADDRESS);
    });

    it("copies the address to the clipboard and confirms", async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });

        renderWithClient(<TopUpDialog address={ADDRESS} />);

        fireEvent.click(screen.getByTestId("open-top-up"));
        fireEvent.click(await screen.findByTestId("top-up-copy"));

        expect(writeText).toHaveBeenCalledWith(ADDRESS);
        expect(await screen.findByTestId("top-up-copy-feedback")).toHaveTextContent(
            "Address copied to clipboard"
        );
        expect(screen.getByTestId("top-up-copy")).toHaveTextContent("Copied");
    });

    it("clears the copied confirmation after the feedback timeout", async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });

        renderWithClient(<TopUpDialog address={ADDRESS} />);

        fireEvent.click(screen.getByTestId("open-top-up"));
        fireEvent.click(await screen.findByTestId("top-up-copy"));
        await screen.findByTestId("top-up-copy-feedback");

        await act(async () => {
            vi.advanceTimersByTime(2500);
        });

        expect(screen.queryByTestId("top-up-copy-feedback")).not.toBeInTheDocument();
    });

    it("stays silent about copying when the clipboard is unavailable", async () => {
        const writeText = vi.fn().mockRejectedValue(new Error("denied"));
        vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });

        renderWithClient(<TopUpDialog address={ADDRESS} />);

        fireEvent.click(screen.getByTestId("open-top-up"));
        fireEvent.click(await screen.findByTestId("top-up-copy"));

        expect(screen.queryByTestId("top-up-copy-feedback")).not.toBeInTheDocument();
    });

    it("explains the shortfall when an amount is required", async () => {
        renderWithClient(
            <TopUpDialog address={ADDRESS} balance={100} requiredAmount={1_000} />
        );

        fireEvent.click(screen.getByTestId("open-top-up"));

        expect(await screen.findByTestId("top-up-shortfall")).toHaveTextContent(
            "900.00 USDC"
        );
    });

    it("omits the shortfall note when the balance is sufficient", async () => {
        renderWithClient(
            <TopUpDialog address={ADDRESS} balance={5_000} requiredAmount={1_000} />
        );

        fireEvent.click(screen.getByTestId("open-top-up"));

        await screen.findByTestId("top-up-address");
        expect(screen.queryByTestId("top-up-shortfall")).not.toBeInTheDocument();
    });
});

describe("TopUpCta", () => {
    it("appears when the balance is below the required amount", () => {
        renderWithClient(
            <TopUpCta address={ADDRESS} balance={50} requiredAmount={1_000} />
        );

        expect(screen.getByTestId("insufficient-balance")).toBeInTheDocument();
        expect(screen.getByTestId("insufficient-balance")).toHaveTextContent("950.00 USDC");
    });

    it("does not appear when the balance covers the investment", () => {
        renderWithClient(
            <TopUpCta address={ADDRESS} balance={1_000} requiredAmount={1_000} />
        );

        expect(screen.queryByTestId("insufficient-balance")).not.toBeInTheDocument();
    });

    it("does not appear while the balance is still unknown", () => {
        renderWithClient(<TopUpCta address={ADDRESS} balance={null} requiredAmount={1_000} />);

        expect(screen.queryByTestId("insufficient-balance")).not.toBeInTheDocument();
    });

    it("opens the top-up flow from its CTA", async () => {
        vi.spyOn(stellarUsdc, "fetchUsdcBalance").mockResolvedValue(0);

        renderWithClient(<TopUpCta address={ADDRESS} balance={50} requiredAmount={1_000} />);

        fireEvent.click(screen.getByTestId("top-up-cta"));

        expect(await screen.findByTestId("top-up-qr")).toBeInTheDocument();
        expect(screen.getByTestId("top-up-address")).toHaveTextContent(ADDRESS);
    });
});
