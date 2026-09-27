import { describe, it, expect } from "vitest";
import {
    computeReputationScore,
    fundingProgressPercent,
    isKycApproved,
    isOpenForInvestment,
    selectActiveInvoices,
    selectSettledInvoices,
    settlementOutcomeLabel,
    formatDate,
    formatMemberSince,
    type IssuerInvoice,
    type SettlementOutcome,
} from "@/lib/issuers";

function makeInvoice(overrides: Partial<IssuerInvoice> = {}): IssuerInvoice {
    return {
        id: "inv-1",
        title: "Acme Corp Q3 receivable",
        issuer_id: "issuer-1",
        face_value: 10_000,
        yield_bps: 825,
        status: "settled",
        maturity_date: "2026-01-31T00:00:00.000Z",
        raised: 10_000,
        investor_count: 4,
        settlement: {
            invoice_id: "inv-1",
            maturity_date: "2026-01-31T00:00:00.000Z",
            settled_at: "2026-01-28T00:00:00.000Z",
            outcome: "on_time",
        },
        ...overrides,
    };
}

/** Build `count` settled invoices, all with the given outcome. */
function settledBatch(count: number, outcome: SettlementOutcome): IssuerInvoice[] {
    return Array.from({ length: count }, (_, i) =>
        makeInvoice({
            id: `inv-${i}`,
            settlement: {
                invoice_id: `inv-${i}`,
                maturity_date: "2026-01-31T00:00:00.000Z",
                settled_at: "2026-01-28T00:00:00.000Z",
                outcome,
            },
        })
    );
}

describe("computeReputationScore", () => {
    it("scores 100 for five on-time settlements", () => {
        const result = computeReputationScore(settledBatch(5, "on_time"));

        expect(result.score).toBe(100);
        expect(result.onTimeRate).toBe(100);
        expect(result.settledCount).toBe(5);
        expect(result.onTimeCount).toBe(5);
        expect(result.label).toBe("excellent");
        expect(result.hasTrackRecord).toBe(true);
    });

    it("caps the history component so a clean issuer with many invoices does not exceed 100", () => {
        const result = computeReputationScore(settledBatch(20, "on_time"));
        expect(result.score).toBe(100);
    });

    it("keeps a single perfect settlement well below an established record", () => {
        const one = computeReputationScore(settledBatch(1, "on_time"));
        const five = computeReputationScore(settledBatch(5, "on_time"));

        expect(one.score).toBe(76);
        expect(five.score).toBe(100);
        expect(one.score).toBeLessThan(five.score);
        expect(one.label).toBe("good");
    });

    it("excludes unsettled invoices from both numerator and denominator", () => {
        const invoices = [
            ...settledBatch(2, "on_time"),
            makeInvoice({
                id: "draft-inv",
                status: "open",
                settlement: null,
            }),
            makeInvoice({ id: "rejected-inv", status: "rejected", settlement: null }),
        ];

        const result = computeReputationScore(invoices);

        // 2 on-time settlements, yet 4 invoices exist overall.
        expect(result.settledCount).toBe(2);
        expect(result.onTimeRate).toBe(100);
        expect(result.totalInvoiceCount).toBe(4);
    });

    it("counts late and defaulted settlements against the score", () => {
        const invoices = [
            ...settledBatch(2, "on_time"),
            makeInvoice({
                id: "late",
                settlement: {
                    invoice_id: "late",
                    maturity_date: "2026-01-31T00:00:00.000Z",
                    settled_at: "2026-03-04T00:00:00.000Z",
                    outcome: "late",
                },
            }),
            makeInvoice({
                id: "default",
                settlement: {
                    invoice_id: "default",
                    maturity_date: "2026-01-31T00:00:00.000Z",
                    settled_at: null,
                    outcome: "defaulted",
                },
            }),
        ];

        const result = computeReputationScore(invoices);

        expect(result.settledCount).toBe(4);
        expect(result.onTimeCount).toBe(2);
        expect(result.lateCount).toBe(1);
        expect(result.defaultedCount).toBe(1);
        expect(result.onTimeRate).toBe(50);
        // 50% of 70 = 35 punctuality, plus 4/5 of the 30-point history depth.
        expect(result.score).toBe(59);
        expect(result.label).toBe("fair");
    });

    it("scores 0 for an issuer with no settled invoices and reports no track record", () => {
        const invoices = [
            makeInvoice({ id: "a", status: "open", settlement: null }),
            makeInvoice({ id: "b", status: "funded", settlement: null }),
        ];

        const result = computeReputationScore(invoices);

        expect(result.score).toBe(0);
        expect(result.onTimeRate).toBe(0);
        expect(result.hasTrackRecord).toBe(false);
        expect(result.label).toBe("no-track-record");
    });

    it("handles an empty invoice list without dividing by zero", () => {
        const result = computeReputationScore([]);

        expect(result.score).toBe(0);
        expect(Number.isNaN(result.score)).toBe(false);
        expect(result.settledCount).toBe(0);
    });

    it("scores an issuer who always defaults as poor, not zero-volume", () => {
        const result = computeReputationScore(settledBatch(5, "defaulted"));

        expect(result.onTimeRate).toBe(0);
        expect(result.score).toBe(30);
        expect(result.label).toBe("poor");
    });

    it("treats a settled status with no settlement record as settled but not on time", () => {
        const result = computeReputationScore([makeInvoice({ settlement: null })]);

        expect(result.settledCount).toBe(1);
        expect(result.onTimeCount).toBe(0);
        expect(result.onTimeRate).toBe(0);
    });
});

describe("isKycApproved", () => {
    it("is true only for approved issuers", () => {
        expect(isKycApproved({ kyc_status: "approved" })).toBe(true);
        expect(isKycApproved({ kyc_status: "pending" })).toBe(false);
        expect(isKycApproved({ kyc_status: "rejected" })).toBe(false);
    });
});

describe("fundingProgressPercent", () => {
    it("computes the percentage of face value committed", () => {
        expect(fundingProgressPercent({ raised: 5_000, face_value: 10_000 })).toBe(50);
    });

    it("caps over-funding at 100", () => {
        expect(fundingProgressPercent({ raised: 15_000, face_value: 10_000 })).toBe(100);
    });

    it("returns 0 for a zero face value instead of dividing by zero", () => {
        expect(fundingProgressPercent({ raised: 100, face_value: 0 })).toBe(0);
    });
});

describe("isOpenForInvestment", () => {
    const now = new Date("2026-06-01T00:00:00.000Z");

    it("is true for an open invoice maturing in the future", () => {
        expect(
            isOpenForInvestment(
                { status: "open", maturity_date: "2026-07-01T00:00:00.000Z" },
                now
            )
        ).toBe(true);
    });

    it("is false once maturity has passed", () => {
        expect(
            isOpenForInvestment(
                { status: "open", maturity_date: "2026-05-01T00:00:00.000Z" },
                now
            )
        ).toBe(false);
    });

    it("is false for any non-open status even before maturity", () => {
        for (const status of ["draft", "funded", "settled", "rejected"] as const) {
            expect(
                isOpenForInvestment(
                    { status, maturity_date: "2026-07-01T00:00:00.000Z" },
                    now
                )
            ).toBe(false);
        }
    });
});

describe("selectActiveInvoices", () => {
    const now = new Date("2026-06-01T00:00:00.000Z");

    it("returns only open, unexpired invoices ordered by soonest maturity", () => {
        const invoices = [
            makeInvoice({ id: "late", status: "open", maturity_date: "2026-08-01T00:00:00.000Z" }),
            makeInvoice({ id: "expired", status: "open", maturity_date: "2026-01-01T00:00:00.000Z" }),
            makeInvoice({ id: "soon", status: "open", maturity_date: "2026-06-15T00:00:00.000Z" }),
            makeInvoice({ id: "settled", status: "settled", maturity_date: "2026-12-01T00:00:00.000Z" }),
        ];

        expect(selectActiveInvoices(invoices, now).map((i) => i.id)).toEqual(["soon", "late"]);
    });
});

describe("selectSettledInvoices", () => {
    it("returns the repayment track record ordered by settlement date descending", () => {
        const invoices = [
            makeInvoice({
                id: "older",
                settlement: {
                    invoice_id: "older",
                    maturity_date: "2026-01-31T00:00:00.000Z",
                    settled_at: "2026-02-01T00:00:00.000Z",
                    outcome: "on_time",
                },
            }),
            makeInvoice({
                id: "newer",
                settlement: {
                    invoice_id: "newer",
                    maturity_date: "2026-03-31T00:00:00.000Z",
                    settled_at: "2026-03-30T00:00:00.000Z",
                    outcome: "on_time",
                },
            }),
            makeInvoice({ id: "open", status: "open", settlement: null }),
        ];

        expect(selectSettledInvoices(invoices).map((i) => i.id)).toEqual(["newer", "older"]);
    });
});

describe("settlementOutcomeLabel", () => {
    it("labels each outcome", () => {
        expect(settlementOutcomeLabel("on_time")).toBe("Paid on time");
        expect(settlementOutcomeLabel("late")).toBe("Paid late");
        expect(settlementOutcomeLabel("defaulted")).toBe("Defaulted");
        expect(settlementOutcomeLabel(null)).toBe("Awaiting settlement");
        expect(settlementOutcomeLabel(undefined)).toBe("Awaiting settlement");
    });
});

describe("formatters", () => {
    it("formats an ISO date", () => {
        expect(formatDate("2026-03-12T00:00:00.000Z")).toBe("12 Mar 2026");
    });

    it("renders an em dash for missing or invalid dates", () => {
        expect(formatDate(null)).toBe("—");
        expect(formatDate(undefined)).toBe("—");
        expect(formatDate("not-a-date")).toBe("—");
    });

    it("formats the member-since month and year", () => {
        expect(formatMemberSince("2024-03-12T00:00:00.000Z")).toBe("March 2024");
    });

    it("falls back to Unknown for a missing member-since", () => {
        expect(formatMemberSince(null)).toBe("Unknown");
    });
});
