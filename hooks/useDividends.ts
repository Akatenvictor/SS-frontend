"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  claimAllDividends,
  claimDividendCycle,
  fetchInvestorDividends,
} from "@/lib/api";

export const DIVIDENDS_QUERY_KEY = ["investor", "dividends"] as const;

export function useInvestorDividends() {
  return useQuery({
    queryKey: DIVIDENDS_QUERY_KEY,
    queryFn: fetchInvestorDividends,
  });
}

export function useClaimDividendCycleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cycleId: string) => claimDividendCycle(cycleId),
    onSuccess: () => {
      toast.success("Dividend claimed successfully");
      queryClient.invalidateQueries({ queryKey: DIVIDENDS_QUERY_KEY });
    },
    onError: () => {
      toast.error("Dividend claim failed");
    },
  });
}

export function useClaimAllDividendsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => claimAllDividends(),
    onSuccess: () => {
      toast.success("All dividends claimed successfully");
      queryClient.invalidateQueries({ queryKey: DIVIDENDS_QUERY_KEY });
    },
    onError: () => {
      toast.error("Batch claim failed");
    },
  });
}
