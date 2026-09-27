"use client";

/**
 * One-time toast notification when early repayment is detected on an invoice.
 *
 * Uses a session-storage flag so the toast fires only once per session per
 * invoice — subsequent page visits or polling refreshes within the same
 * session will not re-trigger it.
 */

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { InvoiceDetail } from "@/lib/api";

const SESSION_KEY_PREFIX = "early-repayment-notified-";

function storageKey(invoiceId: string): string {
  return `${SESSION_KEY_PREFIX}${invoiceId}`;
}

function hasNotified(invoiceId: string): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(storageKey(invoiceId)) === "true";
}

function markNotified(invoiceId: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(storageKey(invoiceId), "true");
}

/**
 * Returns a toast descriptor for early repayment, or null if already notified
 * this session or no early repayment is present.
 */
export function getEarlyRepaymentToast(
  invoice: InvoiceDetail,
): { title: string; description: string } | null {
  if (!invoice.early_repayment) return null;
  if (hasNotified(invoice.id)) return null;

  const { amount, new_settlement_date } = invoice.early_repayment;
  const formattedDate = new Date(new_settlement_date).toLocaleDateString();

  return {
    title: "Early Repayment Initiated",
    description: `This invoice has been repaid early. Settlement expected by ${formattedDate}. Repayment amount: ${amount.toLocaleString()} XLM.`,
  };
}

/**
 * Call this in your page/component when early repayment is detected.
 * Fires a toast exactly once per session per invoice.
 */
export function notifyEarlyRepayment(invoice: InvoiceDetail): void {
  const descriptor = getEarlyRepaymentToast(invoice);
  if (!descriptor) return;

  markNotified(invoice.id);
  toast.info(descriptor.title, {
    description: descriptor.description,
    duration: 10_000,
  });
}

/**
 * React hook wrapper — watches the invoice detail and fires the notification
 * on first detection of early repayment. Safe to call unconditionally.
 */
export function useEarlyRepaymentNotification(invoice: InvoiceDetail | undefined): void {
  const notifiedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!invoice || !invoice.early_repayment) return;
    if (notifiedRef.current === invoice.id) return;

    notifiedRef.current = invoice.id;
    notifyEarlyRepayment(invoice);
  }, [invoice]);
}
