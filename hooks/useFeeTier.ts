"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchFeeTier, type FeeTierInfo } from "@/lib/api";

export const FEE_TIER_QUERY_KEY = ["fee-tier"] as const;
export const FEE_TIER_REFETCH_INTERVAL = 60_000;

/** Issue #345: dynamic platform fee tier, refreshed every 60s. */
export function useFeeTier() {
  return useQuery<FeeTierInfo>({
    queryKey: FEE_TIER_QUERY_KEY,
    queryFn: fetchFeeTier,
    refetchInterval: FEE_TIER_REFETCH_INTERVAL,
    staleTime: 30 * 1000,
  });
}
