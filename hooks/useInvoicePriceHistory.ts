"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchInvoicePriceHistory,
  type InvoicePriceHistory,
  type PriceHistoryRangeParam,
} from "@/lib/api";

/** Issue #413: price history chart on the secondary market listing detail page. */
export const INVOICE_PRICE_HISTORY_QUERY_KEY = ["invoice-price-history"] as const;

export function useInvoicePriceHistory(
  invoiceId: string | null | undefined,
  range: PriceHistoryRangeParam
) {
  return useQuery<InvoicePriceHistory>({
    queryKey: [...INVOICE_PRICE_HISTORY_QUERY_KEY, invoiceId, range],
    queryFn: ({ signal }) => fetchInvoicePriceHistory(invoiceId as string, range, signal),
    enabled: Boolean(invoiceId),
    staleTime: 60 * 1000,
  });
}
