"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchInvoiceProtection,
  type InvoiceProtectionInfo,
} from "@/lib/api";

export const INVOICE_PROTECTION_QUERY_KEY = ["invoice-protection"] as const;
export const INVOICE_PROTECTION_REFETCH_INTERVAL = 60_000;

/** Issue #343: sell tax % + buyback pool balance, refreshed every 60s. */
export function useInvoiceProtection(invoiceId: string | null | undefined) {
  return useQuery<InvoiceProtectionInfo>({
    queryKey: [...INVOICE_PROTECTION_QUERY_KEY, invoiceId],
    queryFn: () => fetchInvoiceProtection(invoiceId as string),
    enabled: Boolean(invoiceId),
    refetchInterval: INVOICE_PROTECTION_REFETCH_INTERVAL,
    staleTime: 30 * 1000,
  });
}
