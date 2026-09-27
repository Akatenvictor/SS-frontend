"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  claimVestedKeys,
  fetchVestingSchedule,
  type VestingSchedule,
} from "@/lib/api";
import type { InvestmentPosition } from "@/lib/portfolio";
import { PORTFOLIO_QUERY_KEY } from "@/hooks/usePortfolio";

export const vestingSchedulesQueryKey = (
  walletAddress?: string | null,
  keyIds: string[] = []
) => ["vesting-schedules", walletAddress, keyIds] as const;

function uniqueHeldKeyIds(positions: InvestmentPosition[]): string[] {
  return Array.from(
    new Set(
      positions
        .filter((position) => (position.quantity ?? 0) > 0)
        .map((position) => position.key_id)
        .filter((keyId): keyId is string => Boolean(keyId))
    )
  ).sort();
}

export function useVestingSchedules(
  positions: InvestmentPosition[],
  walletAddress?: string | null,
  token?: string | null
) {
  const keyIds = uniqueHeldKeyIds(positions);

  return useQuery({
    queryKey: vestingSchedulesQueryKey(walletAddress, keyIds),
    queryFn: async () => {
      const schedules = await Promise.all(
        keyIds.map((keyId) =>
          fetchVestingSchedule(keyId, walletAddress ?? "", token ?? undefined)
        )
      );

      return schedules.filter(
        (schedule): schedule is VestingSchedule => schedule !== null
      );
    },
    enabled: Boolean(walletAddress && keyIds.length > 0),
  });
}

export function useKeyVestingSchedule(
  keyId: string,
  walletAddress?: string | null,
  token?: string | null
) {
  return useQuery({
    queryKey: vestingSchedulesQueryKey(walletAddress, [keyId]),
    queryFn: () => fetchVestingSchedule(keyId, walletAddress ?? "", token ?? undefined),
    enabled: Boolean(walletAddress && keyId),
  });
}

export function useClaimVestedKeysMutation(walletAddress?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      keyId,
      token,
    }: {
      keyId: string;
      token?: string | null;
    }) => {
      if (!walletAddress) {
        throw new Error("Connect your wallet to claim vested keys");
      }

      return claimVestedKeys(keyId, walletAddress, token ?? undefined);
    },
    onSuccess: () => {
      toast.success("Vested keys claimed");
      queryClient.invalidateQueries({ queryKey: PORTFOLIO_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["vesting-schedules"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to claim vested keys"
      );
    },
  });
}
