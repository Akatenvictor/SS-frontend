"use client";

import { Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { claimVestedKeys } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useKeyVestingSchedule, vestingSchedulesQueryKey } from "@/hooks/useVesting";

interface CreatorVestingSectionProps {
  keyId: string;
}

function formatKeyAmount(amount: number): string {
  return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatDate(date?: string | null): string | null {
  if (!date) return null;
  return new Date(date).toLocaleDateString();
}

export function CreatorVestingSection({ keyId }: CreatorVestingSectionProps) {
  const { address, jwt } = useAuth();
  const queryClient = useQueryClient();
  const scheduleQuery = useKeyVestingSchedule(keyId, address, jwt);

  const claimMutation = useMutation({
    mutationFn: () => {
      if (!address) {
        throw new Error("Connect your wallet to claim vested keys");
      }
      return claimVestedKeys(keyId, address, jwt ?? undefined);
    },
    onSuccess: () => {
      const claimed = scheduleQuery.data?.claimableAmount ?? 0;
      toast.success(`Claimed ${formatKeyAmount(claimed)} keys`);
      queryClient.invalidateQueries({
        queryKey: vestingSchedulesQueryKey(address, [keyId]),
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to claim vested keys"
      );
    },
  });

  if (scheduleQuery.isLoading) {
    return (
      <Card data-testid="creator-vesting-loading">
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

  const schedule = scheduleQuery.data;

  if (!schedule || schedule.totalKeys <= 0) {
    return null;
  }

  const percentage =
    schedule.totalKeys > 0
      ? Math.min((schedule.vestedAmount / schedule.totalKeys) * 100, 100)
      : 0;
  const vestingEndsAt = formatDate(schedule.vestingEndsAt);

  return (
    <Card data-testid="creator-vesting-section">
      <CardHeader>
        <h2 className="text-lg font-semibold">Vesting</h2>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Vested</span>
            <span>{percentage.toFixed(1)}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
            <div
              role="progressbar"
              aria-label="Vesting progress"
              aria-valuenow={Math.round(percentage)}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-full bg-primary"
              data-testid="creator-vesting-progress"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <span>
            {formatKeyAmount(schedule.vestedAmount)} of{" "}
            {formatKeyAmount(schedule.totalKeys)} keys vested
          </span>
          <span data-testid="creator-vesting-claimed">
            {formatKeyAmount(schedule.claimedAmount ?? 0)} claimed
          </span>
          <span data-testid="creator-vesting-claimable">
            {formatKeyAmount(schedule.claimableAmount)} claimable
          </span>
          {vestingEndsAt && <span>Vesting ends {vestingEndsAt}</span>}
        </div>

        <Button
          type="button"
          onClick={() => claimMutation.mutate()}
          disabled={schedule.claimableAmount <= 0 || claimMutation.isPending}
          data-testid="creator-claim-vested"
        >
          {claimMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Claim
        </Button>
      </CardContent>
    </Card>
  );
}
