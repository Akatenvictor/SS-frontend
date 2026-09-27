"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchLeaderboard, type LeaderboardInvestor } from "@/lib/api";

export const LEADERBOARD_QUERY_KEY = ["leaderboard"] as const;
export const LEADERBOARD_REFETCH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useLeaderboard() {
  return useQuery<LeaderboardInvestor[]>({
    queryKey: LEADERBOARD_QUERY_KEY,
    queryFn: fetchLeaderboard,
    refetchInterval: LEADERBOARD_REFETCH_INTERVAL,
  });
}
