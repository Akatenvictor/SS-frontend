"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchInvoiceDemandMetrics,
  type InvoiceDemandMetrics,
} from "@/lib/api";

/** Both demand metrics refresh on the same 60s cadence (#422). */
export const DEMAND_METRICS_POLL_INTERVAL_MS = 60_000;

interface UseInvoiceDemandMetricsOptions {
  invoiceId: string;
  enabled?: boolean;
}

/**
 * Investor count and 24h funding velocity for one invoice, polled every 60
 * seconds (#422).
 *
 * `placeholderData` carries the previous payload through each refetch. Without
 * it React Query drops `data` to `undefined` for the duration of the request,
 * and the badge would unmount and remount every minute — the flicker the
 * acceptance criteria call out. Holding the last good value means the count
 * and badge stay on screen and change in place.
 *
 * Polling is suspended while the tab is hidden: an investor looking at a
 * marketplace tab they have switched away from is not watching these numbers,
 * and a background interval per card is a lot of requests for nothing.
 */
export function useInvoiceDemandMetrics({
  invoiceId,
  enabled = true,
}: UseInvoiceDemandMetricsOptions) {
  return useQuery<InvoiceDemandMetrics>({
    queryKey: ["invoice-demand-metrics", invoiceId],
    queryFn: () => fetchInvoiceDemandMetrics(invoiceId),
    enabled: enabled && Boolean(invoiceId),
    refetchInterval: () => {
      if (typeof document !== "undefined" && document.hidden) return false;
      return DEMAND_METRICS_POLL_INTERVAL_MS;
    },
    placeholderData: (previous) => previous,
    staleTime: DEMAND_METRICS_POLL_INTERVAL_MS,
  });
}
