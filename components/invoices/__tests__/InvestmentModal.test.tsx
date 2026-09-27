import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { InvestmentModal, MIN_INVESTMENT } from "../InvestmentModal";
import * as api from "@/lib/api";
import * as stellarUsdc from "@/lib/stellar/usdc";

const ADDRESS = "GD5X6MPY7HXHYHZWRXKJQKQ7T2WQ2Y3H4ZQ2Y2KQ2WQ2Y2KQ2WQ2Y2KQ2";

function renderWithClient(ui: ReactElement) {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function renderModal(
    props: Partial<React.ComponentProps<typeof InvestmentModal>> = {}
) {
    return renderWithClient(
        <InvestmentModal
            invoiceId="inv-1"
            invoiceTitle="Acme Corp Q3 receivable"
            maxAmount={10_000}
            address={ADDRESS}
            network="testnet"
            open
            onOpenChange={vi.fn()}
            {...props}
        />
    );
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe("InvestmentModal", () => {
    it("shows the wallet balance once loaded", async () => {
        vi.spyOn(stellarUsdc, "fetchUsdcBalance").mockResolvedValue(2_500);

        renderModal();

        await screen.findByTestId("investment-modal-balance");
        await waitFor(() =>
            expect(screen.getByTestId("investment-modal-balance")).toHaveTextContent(
                "2,500.00 USDC"
            )
        );
    });

    it("asks the user to connect when no wallet is connected", () => {
        renderModal({ address: null });

        expect(screen.getByTestId("investment-connect-required")).toBeInTheDocument();
        expect(screen.getByTestId("investment-submit")).toBeDisabled();
    });

    it("keeps submit disabled until a valid amount is entered", async () => {
        vi.spyOn(stellarUsdc, "fetchUsdcBalance").mockResolvedValue(2_500);

        renderModal();

        await screen.findByTestId("investment-modal-balance");
        expect(screen.getByTestId("investment-submit")).toBeDisabled();

        fireEvent.change(screen.getByLabelText(/Investment amount/i), {
            target: { value: "500" },
        });
        expect(screen.getByTestId("investment-submit")).toBeEnabled();
    });

    it("rejects an amount below the minimum", async () => {
        vi.spyOn(stellarUsdc, "fetchUsdcBalance").mockResolvedValue(2_500);

        renderModal();

        await screen.findByTestId("investment-modal-balance");
        fireEvent.change(screen.getByLabelText(/Investment amount/i), {
            target: { value: String(MIN_INVESTMENT - 1) },
        });

        expect(screen.getByTestId("investment-submit")).toBeDisabled();
        expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("shows the top-up CTA when the balance cannot cover the amount", async () => {
        vi.spyOn(stellarUsdc, "fetchUsdcBalance").mockResolvedValue(100);

        renderModal();

        await screen.findByTestId("investment-modal-balance");
        fireEvent.change(screen.getByLabelText(/Investment amount/i), {
            target: { value: "1000" },
        });

        expect(screen.getByTestId("insufficient-balance")).toBeInTheDocument();
        expect(screen.getByTestId("insufficient-balance")).toHaveTextContent("900.00 USDC");
        expect(screen.getByTestId("investment-submit")).toBeDisabled();
    });

    it("does not show the top-up CTA when the balance is sufficient", async () => {
        vi.spyOn(stellarUsdc, "fetchUsdcBalance").mockResolvedValue(5_000);

        renderModal();

        await screen.findByTestId("investment-modal-balance");
        fireEvent.change(screen.getByLabelText(/Investment amount/i), {
            target: { value: "1000" },
        });

        expect(screen.queryByTestId("insufficient-balance")).not.toBeInTheDocument();
        expect(screen.getByTestId("investment-submit")).toBeEnabled();
    });

    it("opens the top-up flow from inside the investment modal", async () => {
        vi.spyOn(stellarUsdc, "fetchUsdcBalance").mockResolvedValue(100);

        renderModal();

        await screen.findByTestId("investment-modal-balance");
        fireEvent.change(screen.getByLabelText(/Investment amount/i), {
            target: { value: "1000" },
        });
        fireEvent.click(screen.getByTestId("top-up-cta"));

        expect(await screen.findByTestId("top-up-qr")).toBeInTheDocument();
        expect(screen.getByTestId("top-up-address")).toHaveTextContent(ADDRESS);
    });

    it("submits the investment and notifies the caller", async () => {
        vi.spyOn(stellarUsdc, "fetchUsdcBalance").mockResolvedValue(5_000);
        const investSpy = vi
            .spyOn(api, "investInInvoice")
            .mockResolvedValue({ success: true, invested_amount: 1_000 });
        const onInvested = vi.fn();

        renderModal({ onInvested });

        await screen.findByTestId("investment-modal-balance");
        fireEvent.change(screen.getByLabelText(/Investment amount/i), {
            target: { value: "1000" },
        });
        fireEvent.click(screen.getByTestId("investment-submit"));

        await waitFor(() => expect(investSpy).toHaveBeenCalledWith("inv-1", 1000));
        expect(onInvested).toHaveBeenCalled();
        expect(await screen.findByText("Invested")).toBeInTheDocument();
    });

    it("surfaces an error when the investment fails", async () => {
        vi.spyOn(stellarUsdc, "fetchUsdcBalance").mockResolvedValue(5_000);
        vi.spyOn(api, "investInInvoice").mockRejectedValue(new Error("Investment failed"));

        renderModal();

        await screen.findByTestId("investment-modal-balance");
        fireEvent.change(screen.getByLabelText(/Investment amount/i), {
            target: { value: "1000" },
        });
        fireEvent.click(screen.getByTestId("investment-submit"));

        expect(await screen.findByTestId("investment-error")).toHaveTextContent(
            "Investment failed"
        );
    });

    it("caps the amount at the remaining unfunded balance", async () => {
        vi.spyOn(stellarUsdc, "fetchUsdcBalance").mockResolvedValue(5_000);

        renderModal({ maxAmount: 750 });

        await screen.findByTestId("investment-modal-balance");
        expect(screen.getByPlaceholderText("10 - 750")).toBeInTheDocument();
    });
});
