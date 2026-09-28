import { formatXLM } from "./format";

export interface InvestmentPosition {
    invoice_id: string;
    invoice_title: string;
    committed_amount: number;
    status: "active" | "settled" | "expired";
    share_percent?: number | null;
    key_id?: string;
    key_title?: string;
    quantity?: number;
    lockup_expires_at?: string | null;
    remaining_capacity?: number;
    /**
     * Fractions already offered on the secondary market. They are committed to
     * a listing, so they cannot be transferred again until the listing is
     * cancelled or sold (#421).
     */
    listed_quantity?: number;
}

export interface PortfolioSummary {
    activeTotal: number;
    formattedTotal: string;
}

/**
 * Calculates the total committed amount across all active invoice positions.
 * Settled and expired invoices are excluded from the active total.
 */
export function calculateActiveTotal(positions: InvestmentPosition[]): PortfolioSummary {
    const activeTotal = positions
        .filter((p) => p.status === "active")
        .reduce((sum, p) => sum + p.committed_amount, 0);

    return {
        activeTotal,
        formattedTotal: formatXLM(activeTotal),
    };
}

/**
 * Fractions an investor may still transfer for a position (#421).
 *
 * Anything already on a secondary-market listing is encumbered: the listing is
 * a live promise to a buyer, so transferring it out would leave the buyer with
 * nothing. Negative balances are clamped to zero so a position that
 * predates the `listed_quantity` field (it reads as `undefined` and coerces to
 * 0) cannot produce a negative allowance.
 */
export function availableFractions(position: InvestmentPosition): number {
    const owned = position.quantity ?? 0;
    const listed = position.listed_quantity ?? 0;
    return Math.max(0, owned - listed);
}
