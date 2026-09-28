"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TxHash } from "@/components/ui/tx-hash";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useClaimAllDividendsMutation,
  useClaimDividendCycleMutation,
  useInvestorDividends,
} from "@/hooks/useDividends";


function formatDate(value: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

/**
 * Dividend claim page for invoice holders (issue #350).
 * Lists claimable dividends per distribution cycle with amount + date,
 * per-cycle claim buttons, batch claim-all, claimed history with explorer
 * links, totals summary and an empty state.
 */
export function DividendClaimPage() {
  const { data, isLoading, isError } = useInvestorDividends();
  const claimCycle = useClaimDividendCycleMutation();
  const claimAll = useClaimAllDividendsMutation();

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="dividend-claim-loading">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground" data-testid="dividend-error">
            Failed to load dividends. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  const claimable = data.claimable.filter((c) => c.claimable && !c.claimed);
  const history = data.history;

  const handleClaimCycle = (cycleId: string) => {
    claimCycle.mutate(cycleId);
  };

  const handleClaimAll = () => {
    claimAll.mutate();
  };

  return (
    <div className="space-y-6" data-testid="dividend-claim-page">
      {/* Summary totals */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card data-testid="dividend-summary-earned">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total earned</p>
            <p className="text-2xl font-bold" data-testid="total-earned">
              {data.total_earned.toLocaleString()} XLM
            </p>
          </CardContent>
        </Card>
        <Card data-testid="dividend-summary-pending">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total pending</p>
            <p className="text-2xl font-bold" data-testid="total-pending">
              {data.total_pending.toLocaleString()} XLM
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Claimable per cycle */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-lg font-semibold">Claimable dividends</h2>
          {claimable.length > 0 && (
            <Button
              onClick={handleClaimAll}
              disabled={claimAll.isPending}
              data-testid="claim-all-button"
            >
              {claimAll.isPending ? "Claiming..." : "Claim all"}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {claimable.length === 0 ? (
            <p
              className="py-6 text-center text-sm text-muted-foreground"
              data-testid="dividend-empty-state"
            >
              No dividends available to claim right now.
            </p>
          ) : (
            <ul className="space-y-3" data-testid="dividend-claimable-list">
              {claimable.map((item) => (
                <li
                  key={item.cycle}
                  data-testid={`dividend-cycle-${item.cycle}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3"
                >
                  <div>
                    <p className="font-medium" data-testid={`dividend-cycle-name-${item.cycle}`}>
                      {item.cycle}
                    </p>
                    <p
                      className="text-xs text-muted-foreground"
                      data-testid={`dividend-cycle-date-${item.cycle}`}
                    >
                      {formatDate(item.distribution_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="font-semibold"
                      data-testid={`dividend-cycle-amount-${item.cycle}`}
                    >
                      {item.amount.toLocaleString()} XLM
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleClaimCycle(item.cycle_id ?? item.cycle)}
                      disabled={claimCycle.isPending}
                      data-testid={`claim-button-${item.cycle}`}
                    >
                      {claimCycle.isPending ? "Claiming..." : "Claim"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Claimed history */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Claim history</h2>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p
              className="py-6 text-center text-sm text-muted-foreground"
              data-testid="dividend-history-empty"
            >
              No claimed dividends yet.
            </p>
          ) : (
            <ul className="space-y-3" data-testid="dividend-history-list">
              {history.map((entry, idx) => (
                <li
                  key={`${entry.cycle}-${idx}`}
                  data-testid={`dividend-history-${entry.cycle}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{entry.cycle}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(entry.claimed_at)} · {entry.amount.toLocaleString()} XLM
                    </p>
                  </div>
                  <TxHash
                    hash={entry.transaction_hash}
                    className="text-xs"
                    truncateLength={{ start: 12, end: 0 }}
                    testId={`dividend-tx-${entry.cycle}`}
                  />
                </li>
              ))}
            </ul>
          )}
          <Button asChild variant="ghost" size="sm" className="mt-4">
            <Link href="/investor">Back to portfolio</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
