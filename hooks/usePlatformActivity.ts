"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPlatformActivity, type PlatformActivityEvent } from "@/lib/api";

export const PLATFORM_ACTIVITY_QUERY_KEY = ["platform-activity"] as const;
export const PLATFORM_ACTIVITY_REFETCH_INTERVAL = 30_000;

/** Issue #341: live platform activity feed, polled every 30s. */
export function usePlatformActivity(limit = 20) {
  return useQuery<PlatformActivityEvent[]>({
    queryKey: [...PLATFORM_ACTIVITY_QUERY_KEY, limit],
    queryFn: () => fetchPlatformActivity(limit),
    refetchInterval: PLATFORM_ACTIVITY_REFETCH_INTERVAL,
    staleTime: 15 * 1000,
  });
}
