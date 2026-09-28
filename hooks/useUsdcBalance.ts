"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchUsdcBalance, getUsdcAsset } from "@/lib/stellar/usdc";
import type { Network } from "@/lib/stellar";

/** Auto-refresh cadence for the nav balance chip. */
export const USDC_BALANCE_REFETCH_INTERVAL = 60 * 1000;

export const usdcBalanceQueryKey = (address: string | null, network: Network | null) =>
    ["usdc-balance", address, network] as const;

export interface UseUsdcBalanceResult {
    balance: number | null;
    isLoading: boolean;
    isError: boolean;
    assetIssuer: string;
    /** Force an immediate refetch, e.g. after a transaction confirms. */
    refresh: () => void;
}

/**
 * Tracks the connected wallet's USDC balance.
 *
 * Refetches every 60 seconds so the nav chip does not drift from the chain, and
 * `refresh()` is called after a transaction confirms so a just-received top-up
 * appears immediately rather than up to a minute later.
 */
export function useUsdcBalance(
    address: string | null,
    network: Network | null
): UseUsdcBalanceResult {
    const query = useQuery({
        queryKey: usdcBalanceQueryKey(address, network),
        queryFn: () => fetchUsdcBalance(address as string, (network ?? "testnet") as Network),
        enabled: Boolean(address),
        refetchInterval: USDC_BALANCE_REFETCH_INTERVAL,
        staleTime: USDC_BALANCE_REFETCH_INTERVAL,
    });

    return {
        balance: query.data ?? null,
        isLoading: query.isLoading && Boolean(address),
        isError: query.isError,
        assetIssuer: getUsdcAsset((network ?? "testnet") as Network).assetIssuer,
        refresh: () => {
            void query.refetch();
        },
    };
}
