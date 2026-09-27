"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPortfolio } from "@/lib/api";

export const PORTFOLIO_QUERY_KEY = ["portfolio"] as const;

export function usePortfolio() {
  return useQuery({
    queryKey: PORTFOLIO_QUERY_KEY,
    queryFn: fetchPortfolio,
    staleTime: 60 * 1000, // 60 seconds - serve cached data instantly
    gcTime: 5 * 60 * 1000, // 5 minutes - keep data in memory for garbage collection
  });
}
