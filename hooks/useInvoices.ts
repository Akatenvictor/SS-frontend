"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchInvoices, type InvoicesResponse } from "@/lib/api";

export const INVOICES_QUERY_KEY = ["invoices"] as const;
export const STALE_TIME = 60 * 1000;

export function useInvoices() {
  return useInfiniteQuery<InvoicesResponse>({
    queryKey: INVOICES_QUERY_KEY,
    queryFn: ({ pageParam }) => fetchInvoices(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.next_cursor ?? undefined : undefined,
    staleTime: STALE_TIME,
  });
}
