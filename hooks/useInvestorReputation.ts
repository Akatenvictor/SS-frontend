"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchInvestorReputation,
  type InvestorReputation,
} from "@/lib/api";

export const INVESTOR_REPUTATION_QUERY_KEY = ["investor-reputation"] as const;

/** Issue #342: investor reputation score + breakdown + history. */
export function useInvestorReputation(wallet: string | null | undefined) {
  return useQuery<InvestorReputation>({
    queryKey: [...INVESTOR_REPUTATION_QUERY_KEY, wallet],
    queryFn: () => fetchInvestorReputation(wallet as string),
    enabled: Boolean(wallet),
    staleTime: 60 * 1000,
  });
}
