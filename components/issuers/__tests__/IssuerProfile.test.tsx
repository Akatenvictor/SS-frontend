import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { IssuerProfile } from "../IssuerProfile";
import * as api from "@/lib/api";
import type { IssuerInvoice, IssuerProfile as IssuerProfileData } from "@/lib/issuers";

vi.mock("next/navigation", () => ({
    useParams: () => ({ id: "issuer-1" }),
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
}));

function renderWithClient(ui: ReactElement) {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const NOW = new Date("2026-06-01T00:00:00.000Z");

function settledInvoice(id: string, outcome: "on_time" | "late" | "defaulted"): IssuerInvoice {
    return {
        id,
        title: `${id} title`,
        issuer_id: "issuer-1",
        face_value: 10_000,
        yield_bps: 825,
        status: "settled",
        maturity_date: "2026-01-31T00:00:00.000Z",
        raised: 10_000,
        investor_count: 3,
        settlement: {
            invoice_id: id,
            maturity_date: "2026-01-31T00:00:00.000Z",
            settled_at: outcome === "defaulted" ? null : "2026-01-28T00:00:00.000Z",
            outcome,
        },
    };
}

function openInvoice(id: string, maturityDate: string, raised = 2_500): IssuerInvoice {
    return {
        id,
        title: `${id} open receivable`,
        issuer_id: "issuer-1",
        face_value: 10_000,
        yield_bps: 1_050,
        status: "open",
        maturity_date: maturityDate,
        raised,
        investor_count: 1,
        settlement: null,
    };
}

function makeIssuer(overrides: Partial<IssuerProfileData> = {}): IssuerProfileData {
    return {
        id: "issuer-1",
        name: "Northwind Trading Ltd",
        kyc_status: "approved",
        member_since: "2024-03-12T00:00:00.000Z",
        total_funded: 128_500,
        invoices: [],
        ...overrides,
    };
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe("IssuerProfile", () => {
    it("shows a loading skeleton before the profile resolves", async () => {
        vi.spyOn(api, "fetchIssuerProfile").mockReturnValue(new Promise(() => {}));

        renderWithClient(<IssuerProfile issuerId="issuer-1" />);

        expect(screen.getByTestId("issuer-profile-loading")).toBeInTheDocument();
        await act(async () => {});
    });

    it("renders the header with name, member since and total funded", async () => {
        vi.spyOn(api, "fetchIssuerProfile").mockResolvedValue(makeIssuer());

        renderWithClient(<IssuerProfile issuerId="issuer-1" />);

        expect(await screen.findByTestId("issuer-name")).toHaveTextContent("Northwind Trading Ltd");
        expect(screen.getByTestId("issuer-member-since")).toHaveTextContent("Member since March 2024");
        expect(screen.getByTestId("issuer-total-funded")).toHaveTextContent("128,500.00 XLM");
    });

    it("shows the verified badge for a KYC-approved issuer", async () => {
        vi.spyOn(api, "fetchIssuerProfile").mockResolvedValue(makeIssuer({ kyc_status: "approved" }));

        renderWithClient(<IssuerProfile issuerId="issuer-1" />);

        expect(await screen.findByTestId("issuer-verified-badge")).toBeInTheDocument();
        expect(screen.queryByTestId("issuer-kyc-notice")).not.toBeInTheDocument();
    });

    it("hides the verified badge when KYC is pending or rejected", async () => {
        vi.spyOn(api, "fetchIssuerProfile").mockResolvedValue(
            makeIssuer({ kyc_status: "pending" })
        );

        const { unmount } = renderWithClient(<IssuerProfile issuerId="issuer-1" />);

        expect(await screen.findByTestId("issuer-kyc-notice")).toHaveTextContent("KYC pending");
        expect(screen.queryByTestId("issuer-verified-badge")).not.toBeInTheDocument();
        unmount();

        vi.spyOn(api, "fetchIssuerProfile").mockResolvedValue(
            makeIssuer({ kyc_status: "rejected" })
        );
        renderWithClient(<IssuerProfile issuerId="issuer-1" />);

        await waitFor(() =>
            expect(screen.getAllByTestId("issuer-kyc-notice")[0]).toHaveTextContent("KYC rejected")
        );
        expect(screen.queryByTestId("issuer-verified-badge")).not.toBeInTheDocument();
    });

    it("derives the reputation score from the settlement history", async () => {
        vi.spyOn(api, "fetchIssuerProfile").mockResolvedValue(
            makeIssuer({
                invoices: [
                    ...Array.from({ length: 5 }, (_, i) => settledInvoice(`s-${i}`, "on_time")),
                    openInvoice("open-1", "2026-12-01T00:00:00.000Z"),
                ],
            })
        );

        renderWithClient(<IssuerProfile issuerId="issuer-1" />);

        expect(await screen.findByTestId("issuer-reputation-score")).toHaveTextContent("100");
        expect(screen.getByTestId("issuer-reputation-label")).toHaveTextContent("Excellent");
        expect(screen.getByTestId("issuer-on-time-rate")).toHaveTextContent("100.0%");
        expect(screen.getByTestId("issuer-settled-count")).toHaveTextContent("5");
        expect(screen.getByTestId("issuer-on-time-count")).toHaveTextContent("5");
        // The open invoice is counted as an invoice but not as a settlement.
        expect(screen.getByTestId("issuer-total-invoice-count")).toHaveTextContent("6");
    });

    it("reflects a poor settlement record in the score", async () => {
        vi.spyOn(api, "fetchIssuerProfile").mockResolvedValue(
            makeIssuer({
                invoices: [
                    settledInvoice("s-0", "on_time"),
                    settledInvoice("s-1", "defaulted"),
                ],
            })
        );

        renderWithClient(<IssuerProfile issuerId="issuer-1" />);

        expect(await screen.findByTestId("issuer-reputation-score")).toHaveTextContent("47");
        expect(screen.getByTestId("issuer-on-time-rate")).toHaveTextContent("50.0%");
        expect(screen.getByTestId("issuer-reputation-label")).toHaveTextContent("Fair");
    });

    it("reports no track record for an issuer who has never settled", async () => {
        vi.spyOn(api, "fetchIssuerProfile").mockResolvedValue(
            makeIssuer({ invoices: [openInvoice("open-1", "2026-12-01T00:00:00.000Z")] })
        );

        renderWithClient(<IssuerProfile issuerId="issuer-1" />);

        expect(await screen.findByTestId("issuer-reputation-score")).toHaveTextContent("0");
        expect(screen.getByTestId("issuer-reputation-label")).toHaveTextContent(
            "No track record yet"
        );
    });

    it("lists every invoice in the history table with its metrics", async () => {
        vi.spyOn(api, "fetchIssuerProfile").mockResolvedValue(
            makeIssuer({
                invoices: [
                    settledInvoice("settled-1", "on_time"),
                    openInvoice("open-1", "2026-12-01T00:00:00.000Z"),
                    {
                        id: "rejected-1",
                        title: "rejected-1 title",
                        issuer_id: "issuer-1",
                        face_value: 5_000,
                        yield_bps: 1_500,
                        status: "rejected",
                        maturity_date: "2026-02-01T00:00:00.000Z",
                        raised: 0,
                        investor_count: 0,
                        settlement: null,
                    },
                ],
            })
        );

        renderWithClient(<IssuerProfile issuerId="issuer-1" />);

        const table = await screen.findByTestId("invoice-history-table");
        expect(table).toBeInTheDocument();
        expect(screen.getByTestId("history-row-settled-1")).toBeInTheDocument();
        expect(screen.getByTestId("history-row-open-1")).toBeInTheDocument();
        expect(screen.getByTestId("history-row-rejected-1")).toBeInTheDocument();

        // Yield is rendered as an annualised percentage of basis points.
        expect(screen.getByTestId("history-row-settled-1")).toHaveTextContent("8.25%");
        expect(screen.getByTestId("history-row-rejected-1")).toHaveTextContent("15.00%");
        expect(screen.getByTestId("settlement-outcome-settled-1")).toHaveTextContent("On time");
    });

    it("shows an empty history message for a new issuer", async () => {
        vi.spyOn(api, "fetchIssuerProfile").mockResolvedValue(makeIssuer({ invoices: [] }));

        renderWithClient(<IssuerProfile issuerId="issuer-1" />);

        expect(await screen.findByTestId("invoice-history-empty")).toBeInTheDocument();
    });

    it("shows only open, unexpired invoices with progress and an invest CTA", async () => {
        vi.spyOn(api, "fetchIssuerProfile").mockResolvedValue(
            makeIssuer({
                invoices: [
                    openInvoice("open-soon", "2026-06-15T00:00:00.000Z", 2_500),
                    openInvoice("open-later", "2026-09-15T00:00:00.000Z", 9_000),
                    openInvoice("open-expired", "2026-01-15T00:00:00.000Z"),
                    settledInvoice("settled-1", "on_time"),
                ],
            })
        );

        renderWithClient(<IssuerProfile issuerId="issuer-1" now={NOW} />);

        await screen.findByTestId("active-invoice-open-soon");

        expect(screen.getByTestId("active-invoice-open-later")).toBeInTheDocument();
        // Expired and settled invoices are not offered for investment.
        expect(screen.queryByTestId("active-invoice-open-expired")).not.toBeInTheDocument();
        expect(screen.queryByTestId("active-invoice-settled-1")).not.toBeInTheDocument();

        expect(screen.getByTestId("active-invoice-progress-open-soon")).toHaveTextContent(
            "25.0% funded"
        );
        expect(screen.getByTestId("active-invoice-progress-open-later")).toHaveTextContent(
            "90.0% funded"
        );
        expect(screen.getByTestId("invest-cta-open-soon")).toHaveAttribute(
            "href",
            "/marketplace/open-soon"
        );
    });

    it("shows an empty state when no invoice is open for investment", async () => {
        vi.spyOn(api, "fetchIssuerProfile").mockResolvedValue(
            makeIssuer({ invoices: [settledInvoice("settled-1", "on_time")] })
        );

        renderWithClient(<IssuerProfile issuerId="issuer-1" now={NOW} />);

        expect(await screen.findByTestId("active-invoices-empty")).toBeInTheDocument();
    });

    it("renders a 404 state for an unknown issuer id", async () => {
        vi.spyOn(api, "fetchIssuerProfile").mockRejectedValue(
            new api.ApiNotFoundError("Issuer not found")
        );

        renderWithClient(<IssuerProfile issuerId="does-not-exist" />);

        expect(await screen.findByTestId("issuer-not-found")).toBeInTheDocument();
        expect(screen.getByText("Issuer not found")).toBeInTheDocument();
        expect(screen.queryByTestId("issuer-profile")).not.toBeInTheDocument();
    });
});
