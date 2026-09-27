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
