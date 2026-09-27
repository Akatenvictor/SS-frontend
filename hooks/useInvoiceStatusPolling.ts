"use client";

/**
 * Real-time invoice status updates (issue #282).
 *
 * Polls the invoice status endpoint every 30 seconds with React Query's
 * refetchInterval, toasts on status transitions (exactly once per
 * transition), invalidates the relevant caches, and stops polling once the
 * invoice reaches a terminal state (settled / rejected).
 */

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { fetchInvoiceDetail, type Invoice, type InvoiceDetail } from "@/lib/api";

export const INVOICE_STATUS_POLL_INTERVAL_MS = 30_000;

/** Statuses that end the invoice lifecycle — polling stops on these. */
const TERMINAL_STATUSES = new Set<Invoice["status"]>(["settled", "rejected"]);

export function isTerminalInvoiceStatus(status: Invoice["status"]): boolean {
  return TERMINAL_STATUSES.has(status);
}

/** Toast copy per status transition shown to investors and sellers. */
export function statusChangeMessage(status: Invoice["status"]): string {
  switch (status) {
    case "funded":
      return "Invoice is fully funded 🎉";
    case "settled":
      return "Invoice has settled — returns are ready to claim";
    case "rejected":
      return "Invoice was rejected";
    default:
      return `Invoice status changed to ${status}`;
  }
}

interface UseInvoiceStatusPollingOptions {
  invoiceId: string;
  /** Disable polling entirely (e.g. during tests or before an id exists). */
  enabled?: boolean;
}

export function useInvoiceStatusPolling({
  invoiceId,
  enabled = true,
}: UseInvoiceStatusPollingOptions) {
  const queryClient = useQueryClient();
  const previousStatusRef = useRef<Invoice["status"] | null>(null);
  const notifiedTransitionsRef = useRef<Set<string>>(new Set());

  const query = useQuery<InvoiceDetail>({
    queryKey: ["invoice", invoiceId],
    queryFn: () => fetchInvoiceDetail(invoiceId),
    enabled: enabled && Boolean(invoiceId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Polling stops when the invoice reaches a terminal state.
      if (status && isTerminalInvoiceStatus(status)) return false;
      return INVOICE_STATUS_POLL_INTERVAL_MS;
    },
  });

  const status = query.data?.status;

  useEffect(() => {
    if (!status) return;

    const previous = previousStatusRef.current;
    if (previous && previous !== status) {
      const transitionKey = `${previous}->${status}`;
      // No duplicate notifications for the same status event.
      if (!notifiedTransitionsRef.current.has(transitionKey)) {
        notifiedTransitionsRef.current.add(transitionKey);
        toast.success(statusChangeMessage(status));

        // Invalidate relevant caches on a status change: the detail record
        // (refetched) and aggregate lists (marketplace/dashboard).
        queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
        queryClient.invalidateQueries({ queryKey: ["invoices"] });
      }
    }
    previousStatusRef.current = status;
  }, [status, invoiceId, queryClient]);

  return query;
}
