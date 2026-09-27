"use client";

/**
 * Secondary market (issue #380)
 *
 * Browses active resale listings and buys listed fractions. Filters narrow
 * the grid in place, the grid is polled so sold listings drop off on their
 * own, and a completed purchase removes the listing immediately.
 */

import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useWallet } from "@/context/WalletContext";
import {
  useSecondaryListings,
  optimisticRemoveListing,
} from "@/hooks/useSecondaryMarket";
import { BuyFractionModal } from "@/components/marketplace/BuyFractionModal";
import {
  SecondaryListingCard,
  SecondaryListingSkeleton,
} from "@/components/marketplace/SecondaryListingCard";
import { SecondaryMarketFiltersPanel } from "@/components/marketplace/SecondaryMarketFilters";
import {
  EMPTY_SECONDARY_MARKET_FILTERS,
  filterListings,
  type SecondaryMarketFilters,
} from "@/lib/secondaryMarket";
import type { ResaleListing } from "@/lib/api";

export default function SecondaryMarketPage() {
  usePageTitle("Secondary Market");
  const { address, isConnected } = useWallet();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<SecondaryMarketFilters>({
    ...EMPTY_SECONDARY_MARKET_FILTERS,
  });
  const [activeListing, setActiveListing] = useState<ResaleListing | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useSecondaryListings({
    invoiceType: filters.invoiceType,
    minYield: filters.minYield || undefined,
    maxYield: filters.maxYield || undefined,
    minPrice: filters.minPrice || undefined,
    maxPrice: filters.maxPrice || undefined,
    maxDaysToMaturity: filters.maxDaysToMaturity || undefined,
  });

  const allListings = useMemo(() => data?.listings ?? [], [data]);
  const visibleListings = useMemo(() => filterListings(allListings, filters), [allListings, filters]);

  const handleClear = useCallback(() => {
    setFilters({ ...EMPTY_SECONDARY_MARKET_FILTERS });
  }, []);

  return (
    <main className="container mx-auto px-4 py-8 pb-24">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Secondary Market</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Buy invoice fractions listed by other investors.
        </p>
      </header>

      <div className="flex flex-col gap-6 md:flex-row">
        <SecondaryMarketFiltersPanel
          filters={filters}
          onChange={setFilters}
          onClear={handleClear}
          resultCount={visibleListings.length}
          totalCount={allListings.length}
        />

        <div className="flex-1">
          {!isConnected && (
            <p
              className="mb-4 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground"
              data-testid="secondary-market-connect-prompt"
            >
              Connect a wallet to buy fractions.
            </p>
          )}

          {isError ? (
            <div className="space-y-3 text-center" data-testid="secondary-market-error">
              <p className="text-sm text-destructive">Failed to load listings.</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="text-sm text-primary underline"
              >
                Try again
              </button>
            </div>
          ) : isLoading ? (
            <div
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
              aria-busy="true"
              data-testid="secondary-market-loading"
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <SecondaryListingSkeleton key={i} />
              ))}
            </div>
          ) : visibleListings.length === 0 ? (
            <p
              className="rounded-lg border border-dashed p-12 text-center text-muted-foreground"
              data-testid="secondary-market-empty"
            >
              No active listings match your filters.
            </p>
          ) : (
            <>
              {isFetching && (
                <p className="mb-3 text-xs text-muted-foreground" data-testid="secondary-market-refreshing">
                  Refreshing listings…
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="secondary-listings-grid">
                {visibleListings.map((listing) => (
                  <SecondaryListingCard
                    key={listing.id}
                    listing={listing}
                    currentAddress={address}
                    onBuy={setActiveListing}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <BuyFractionModal
        listing={activeListing}
        open={activeListing !== null}
        onOpenChange={(open) => {
          if (!open) setActiveListing(null);
        }}
        onPurchased={(listing) => {
          // Drop it from every cached grid immediately; the 30s poll would
          // catch up on its own, but waiting makes a successful buy look like
          // it did nothing.
          optimisticRemoveListing(queryClient, listing.id);
          setActiveListing(null);
        }}
      />
    </main>
  );
}
