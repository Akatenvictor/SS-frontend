"use client";

/**
 * Secondary-market data hooks (issue #380)
 *
 * Listings are polled so that a listing sold by another user disappears from
 * the grid on the next refresh without the buyer needing to reload, and the
 * buy mutation removes the listing optimistically once the Soroban transfer
 * is confirmed.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  buyFraction,
  fetchResaleListings,
  type BuyFractionInput,
  type ResaleListing,
  type ResaleListingFilters as ApiFilters,
} from "@/lib/api";

/** How often the grid re-checks for listings that have sold out. */
export const SECONDARY_MARKET_POLL_INTERVAL_MS = 30 * 1000;

export const SECONDARY_LISTINGS_QUERY_KEY = ["secondary-market", "listings"] as const;

export function secondaryListingsQueryKey(filters: ApiFilters) {
  return [...SECONDARY_LISTINGS_QUERY_KEY, filters] as const;
}

export function useSecondaryListings(
  filters: ApiFilters = {},
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: secondaryListingsQueryKey(filters),
    queryFn: ({ signal }) => fetchResaleListings(filters, signal),
    enabled,
    refetchInterval: SECONDARY_MARKET_POLL_INTERVAL_MS,
    refetchIntervalInBackground: true,
  });
}

export function useBuyFractionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: BuyFractionInput) => buyFraction(input),

    onSuccess: (result, input) => {
      // Either fully sold or partially bought — refresh so the grid shows the
      // quantity the contract actually has left.
      void queryClient.invalidateQueries({ queryKey: SECONDARY_LISTINGS_QUERY_KEY });
      toast.success(
        `Bought ${input.quantity} ${input.quantity === 1 ? "fraction" : "fractions"}`,
        result.transaction_hash ? { description: result.transaction_hash } : undefined
      );
    },
  });
}

/** Removes a fully-bought listing from every cached filter combination. */
export function optimisticRemoveListing(
  queryClient: ReturnType<typeof useQueryClient>,
  listingId: string
) {
  queryClient.setQueriesData(
    { queryKey: SECONDARY_LISTINGS_QUERY_KEY },
    (old: { listings: ResaleListing[] } | undefined) =>
      old
        ? { ...old, listings: old.listings.filter((listing) => listing.id !== listingId) }
        : old
  );
}
