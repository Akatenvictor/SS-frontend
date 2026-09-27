"use client";

import { Loader2, Wallet } from "lucide-react";
import { formatUsdc } from "@/lib/format";
import { useUsdcBalance } from "@/hooks/useUsdcBalance";
import type { Network } from "@/lib/stellar";

interface UsdcBalanceChipProps {
    address: string;
    network: Network | null;
    /** Bumped by the caller after a transaction confirms. */
    refreshKey?: number;
}

/**
 * Shows the connected wallet's USDC balance beside the address in the nav.
 * Renders nothing until a balance is known so the bar does not reflow on load.
 */
export function UsdcBalanceChip({ address, network, refreshKey = 0 }: UsdcBalanceChipProps) {
    const { balance, isLoading, isError } = useUsdcBalance(address, network);

    if (isLoading) {
        return (
            <span
                data-testid="usdc-balance-loading"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground"
            >
                <Loader2 className="size-3 animate-spin" />
                Balance…
            </span>
        );
    }

    if (isError) {
        return (
            <span
                data-testid="usdc-balance-error"
                title="Could not load your USDC balance"
                className="text-xs text-muted-foreground"
            >
                Balance unavailable
            </span>
        );
    }

    if (balance === null) {
        return null;
    }

    return (
        <span
            data-testid="usdc-balance"
            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums"
            title={refreshKey > 0 ? "Refreshed after transaction" : undefined}
        >
            <Wallet className="size-3" />
            {formatUsdc(balance)}
        </span>
    );
}
