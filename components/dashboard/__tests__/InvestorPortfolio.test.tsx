import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { InvestorPortfolio } from "../InvestorPortfolio";
import type { InvestmentPosition } from "@/lib/portfolio";
import * as api from "@/lib/api";

// PositionCard renders PositionTransferModal for every "active" position
// (issue #119), which needs AuthContext this file doesn't set up — it isn't
// testing transfer behaviour, so it's stubbed the same way
// PositionCard.test.tsx does. See PositionTransferModal's own test file for
// its behaviour (issue #115).
vi.mock("@/components/dashboard/PositionTransferModal", () => ({
    PositionTransferModal: () => null,
}));

const EMPTY_MESSAGE =
    "No active investments yet — browse the marketplace to get started";

function renderWithClient(ui: ReactElement) {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const positions: InvestmentPosition[] = [
    {
        invoice_id: "inv-1",
        invoice_title: "Acme Corp Q3 receivable",
        committed_amount: 2500,
        status: "active",
    },
];

beforeEach(() => {
    vi.restoreAllMocks();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("InvestorPortfolio empty state", () => {
    it("shows the empty state once the query settles with no positions", async () => {
        vi.spyOn(api, "fetchPortfolio").mockResolvedValue({ positions: [] });

        renderWithClient(<InvestorPortfolio />);

        expect(await screen.findByText(EMPTY_MESSAGE)).toBeInTheDocument();
    });

    it("shows skeleton rows while loading, not the empty state", () => {
        vi.spyOn(api, "fetchPortfolio").mockReturnValue(new Promise(() => { }));

        renderWithClient(<InvestorPortfolio />);

        expect(screen.getByTestId("investor-portfolio-loading")).toBeInTheDocument();
        expect(screen.queryByText(EMPTY_MESSAGE)).not.toBeInTheDocument();
    });

    it("replaces the skeletons with the empty state when the empty result arrives", async () => {
        vi.spyOn(api, "fetchPortfolio").mockResolvedValue({ positions: [] });

        renderWithClient(<InvestorPortfolio />);
        expect(screen.getByTestId("investor-portfolio-loading")).toBeInTheDocument();

        await screen.findByText(EMPTY_MESSAGE);
        expect(
            screen.queryByTestId("investor-portfolio-loading")
        ).not.toBeInTheDocument();
    });

    it("points 'Browse Invoices' at the marketplace", async () => {
        vi.spyOn(api, "fetchPortfolio").mockResolvedValue({ positions: [] });

        renderWithClient(<InvestorPortfolio />);

        const link = await screen.findByRole("link", { name: "Browse Invoices" });
        expect(link).toHaveAttribute("href", "/marketplace");
    });

    it("does not show the empty state when positions exist", async () => {
        vi.spyOn(api, "fetchPortfolio").mockResolvedValue({ positions });

        renderWithClient(<InvestorPortfolio />);

        expect(
            await screen.findByText("Acme Corp Q3 receivable")
        ).toBeInTheDocument();
        expect(screen.queryByText(EMPTY_MESSAGE)).not.toBeInTheDocument();
        expect(
            screen.queryByTestId("investor-portfolio-empty")
        ).not.toBeInTheDocument();
    });

    it("separates active and settled/expired positions into position history", async () => {
        vi.spyOn(api, "fetchPortfolio").mockResolvedValue({
            positions: [
                ...positions,
                {
                    invoice_id: "inv-2",
                    invoice_title: "Settled receivable",
                    committed_amount: 1000,
                    status: "settled",
                },
            ],
        });

        renderWithClient(<InvestorPortfolio />);
        expect(await screen.findByText("Acme Corp Q3 receivable")).toBeInTheDocument();
        expect(screen.queryByText("Settled receivable")).not.toBeInTheDocument();

        fireEvent.click(screen.getByTestId("tab-position-history"));
        expect(await screen.findByText("Settled receivable")).toBeInTheDocument();
        expect(screen.queryByText("Acme Corp Q3 receivable")).not.toBeInTheDocument();
    });

    it("replaces the empty state with position rows as soon as data arrives", async () => {
        const fetchSpy = vi
            .spyOn(api, "fetchPortfolio")
            .mockResolvedValue({ positions: [] });

        const client = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        });
        render(
            <QueryClientProvider client={client}>
                <InvestorPortfolio />
            </QueryClientProvider>
        );

        await screen.findByText(EMPTY_MESSAGE);

        // The investor commits to their first invoice and the query refetches.
        fetchSpy.mockResolvedValue({ positions });
        await client.refetchQueries({ queryKey: ["portfolio"] });

        await waitFor(() =>
            expect(screen.getByText("Acme Corp Q3 receivable")).toBeInTheDocument()
        );
        expect(screen.queryByText(EMPTY_MESSAGE)).not.toBeInTheDocument();
    });
});
