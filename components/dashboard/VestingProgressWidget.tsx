"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import {
  useClaimVestedKeysMutation,
  useVestingSchedules,
} from "@/hooks/useVesting";
import type { InvestmentPosition } from "@/lib/portfolio";

interface VestingProgressWidgetProps {
  positions: InvestmentPosition[];
}

function formatKeyAmount(amount: number): string {
  return amount.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

function formatDate(date?: string | null): string | null {
  if (!date) return null;
  return new Date(date).toLocaleDateString();
}

export function VestingProgressWidget({ positions }: VestingProgressWidgetProps) {
  const { address } = useStellarWallet();
  const schedulesQuery = useVestingSchedules(positions, address);
  const claimMutation = useClaimVestedKeysMutation(address);

  if (schedulesQuery.isLoading) {
    return (
      <Card data-testid="vesting-loading">
        <CardHeader>
          <h2 className="text-lg font-semibold">Vesting</h2>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-full" />
        </CardContent>
      </Card>
    );
  }

  const schedules = schedulesQuery.data ?? [];

  if (schedules.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4" data-testid="vesting-section">
      <h2 className="text-lg font-semibold">Vesting</h2>
      {schedules.map((schedule) => {
        const percentage =
          schedule.totalKeys > 0
            ? Math.min((schedule.vestedAmount / schedule.totalKeys) * 100, 100)
            : 0;
        const startDate = formatDate(schedule.startDate);
        const endDate = formatDate(schedule.endDate);
        const isClaiming =
          claimMutation.isPending &&
          claimMutation.variables?.keyId === schedule.keyId;

        return (
          <Card key={schedule.keyId}>
            <CardContent className="space-y-4 pt-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold">
                    {schedule.keyTitle ?? `Key ${schedule.keyId}`}
                  </p>
                  {(startDate || endDate) && (
                    <p className="text-sm text-muted-foreground">
                      {startDate ?? "Start pending"} to {endDate ?? "No end date"}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    claimMutation.mutate({ keyId: schedule.keyId })
                  }
                  disabled={schedule.claimableAmount <= 0 || isClaiming}
                  data-testid={`claim-vested-${schedule.keyId}`}
                >
                  {isClaiming && <Loader2 className="h-4 w-4 animate-spin" />}
                  Claim
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Vested</span>
                  <span>{percentage.toFixed(1)}%</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    role="progressbar"
                    aria-label={`${schedule.keyTitle ?? schedule.keyId} vesting progress`}
                    aria-valuenow={Math.round(percentage)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="h-full bg-primary"
                    data-testid={`vesting-progress-${schedule.keyId}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span>
                  {formatKeyAmount(schedule.vestedAmount)} of{" "}
                  {formatKeyAmount(schedule.totalKeys)} keys vested
                </span>
                <span data-testid={`claimable-${schedule.keyId}`}>
                  {formatKeyAmount(schedule.claimableAmount)} claimable
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
