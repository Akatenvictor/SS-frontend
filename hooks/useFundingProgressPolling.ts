"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchInvoiceFundingProgress, type InvoiceFundingProgress } from "@/lib/api";

export const DETAIL_POLL_INTERVAL_MS = 20_000;
export const CARD_POLL_INTERVAL_MS = 60_000;

export type FundingProgressContext = "detail" | "card";

const INTERVAL_MAP: Record<FundingProgressContext, number> = {
  detail: DETAIL_POLL_INTERVAL_MS,
  card: CARD_POLL_INTERVAL_MS,
};

interface UseFundingProgressPollingOptions {
  invoiceId: string;
  context?: FundingProgressContext;
  enabled?: boolean;
}

export function useFundingProgressPolling({
  invoiceId,
  context = "detail",
  enabled = true,
}: UseFundingProgressPollingOptions) {
  const queryClient = useQueryClient();
  const fullyFundedToastedRef = useRef(false);

  const query = useQuery<InvoiceFundingProgress>({
    queryKey: ["invoice-funding-progress", invoiceId],
    queryFn: () => fetchInvoiceFundingProgress(invoiceId),
    enabled: enabled && Boolean(invoiceId),
    refetchInterval: (q) => {
      if (typeof document !== "undefined" && document.hidden) return false;
      if (q.state.data?.is_fully_funded) return false;
      return INTERVAL_MAP[context];
    },
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    if (query.data?.is_fully_funded && !fullyFundedToastedRef.current) {
      fullyFundedToastedRef.current = true;
      toast.success("Invoice is fully funded 🎉");
      queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    }
  }, [query.data?.is_fully_funded, invoiceId, queryClient]);

  const applyOptimisticInvestment = (amount: number) => {
    queryClient.setQueryData<InvoiceFundingProgress>(
      ["invoice-funding-progress", invoiceId],
      (prev) => {
        if (!prev) return prev;
        const newRaised = prev.raised + amount;
        return { ...prev, raised: newRaised, is_fully_funded: newRaised >= prev.target };
      }
    );
  };

  return { ...query, applyOptimisticInvestment };
}
