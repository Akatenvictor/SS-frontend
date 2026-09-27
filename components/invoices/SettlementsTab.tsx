"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettlements, useClaimSettlement, useBatchClaimSettlement } from "@/hooks/useSettlements";
import { useCurrency } from "@/hooks/useCurrency";
import { ClaimableSettlementCard, ClaimedHistoryCard } from "./SettlementClaimCard";

export function SettlementsTab() {
  const { data, isLoading } = useSettlements();
  const claimMutation = useClaimSettlement();
  const batchClaimMutation = useBatchClaimSettlement();
  const { format } = useCurrency();

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="settlements-loading">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const claimable = data?.claimable ?? [];
  const claimedHistory = data?.claimed_history ?? [];
  const totalClaimable = data?.total_claimable ?? 0;

  return (
    <div className="space-y-6" data-testid="settlements-tab">
      {/* Claimable Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Claimable Settlements</h3>
            <p className="text-sm text-muted-foreground">
              {claimable.length} invoice{claimable.length !== 1 ? "s" : ""} ready to claim
              {totalClaimable > 0 && ` — ${format(totalClaimable)} total`}
            </p>
          </div>
          {claimable.length > 1 && (
            <Button
              onClick={() =>
                batchClaimMutation.mutate(claimable.map((c) => c.invoice_id))
              }
              disabled={batchClaimMutation.isPending}
              data-testid="batch-claim-btn"
            >
              {batchClaimMutation.isPending ? "Claiming All..." : "Claim All"}
            </Button>
          )}
        </div>

        {claimable.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No settlements available to claim yet.
          </p>
        ) : (
          <div className="space-y-3">
            {claimable.map((s) => (
              <ClaimableSettlementCard
                key={s.invoice_id}
                settlement={s}
                onClaim={(id) => claimMutation.mutate(id)}
                isClaiming={claimMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* Claimed History Section */}
      {claimedHistory.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Claimed History</h3>
          <div className="space-y-3">
            {claimedHistory.map((entry) => (
              <ClaimedHistoryCard key={entry.invoice_id} entry={entry} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
