"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  fetchActivity,
  fetchPortfolioSummary,
  fetchRecentActivity,
  fetchUpcomingMaturities,
  type ActivityEvent,
  type ActivityEventType,
  type PortfolioSummary,
  type UpcomingMaturity,
} from "@/lib/api";

export type { ActivityEvent, ActivityEventType, PortfolioSummary, UpcomingMaturity };

export function useActivity(
  type?: ActivityEventType,
  startDate?: string,
  endDate?: string
) {
  return useInfiniteQuery({
    queryKey: ["activity", type, startDate, endDate],
    queryFn: ({ pageParam }) =>
      fetchActivity(pageParam as string | undefined, type, startDate, endDate),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.next_cursor ?? undefined : undefined,
  });
}

export function usePortfolioSummary() {
  return useQuery({
    queryKey: ["portfolio", "summary"],
    queryFn: fetchPortfolioSummary,
  });
}

export function useRecentActivity(limit = 5) {
  return useQuery({
    queryKey: ["portfolio", "recent-activity", limit],
    queryFn: () => fetchRecentActivity(limit),
  });
}

export function useUpcomingMaturities(limit = 3) {
  return useQuery({
    queryKey: ["portfolio", "upcoming-maturities", limit],
    queryFn: () => fetchUpcomingMaturities(limit),
  });
}

export function useActivityEvents(
  type?: ActivityEventType,
  startDate?: string,
  endDate?: string
): ActivityEvent[] {
  const { data } = useActivity(type, startDate, endDate);
  return data?.pages.flatMap((p) => p.events) ?? [];
}