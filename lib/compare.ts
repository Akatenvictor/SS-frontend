/**
 * Marketplace comparison model.
 *
 * A comparison snapshot is a flattened view of an invoice, copied at selection
 * time so the comparison table renders instantly on the compare page without a
 * second round trip.
 */

import type { Invoice } from "@/lib/api";

/** Hard cap on simultaneous comparisons, per the compare feature spec. */
export const MAX_COMPARE_ITEMS = 3;

export type CompareRowStatus = "open" | "funded" | "settled" | "rejected" | "draft";

export interface ComparableInvoice {
  id: string;
  title: string;
  issuer_id: string;
  issuer_name: string;
  /** Face value in XLM. */
  face_value: number;
  /** Annualised yield in basis points (825 === 8.25%). */
  yield_bps: number;
  /** ISO maturity date. */
  maturity_date: string;
  status: CompareRowStatus;
  raised: number;
  investor_count: number;
  /** Issuer reputation 0-100, or null when the issuer has no track record. */
  issuer_score: number | null;
}

/**
 * Projects a marketplace invoice into the comparison shape.
 *
 * `yield_bps` and `issuer_score` are optional on the wire — an issuer that has
 * not settled anything has no score, and yield is only published once an
 * invoice is priced — so both degrade to safe defaults here.
 */
export function toComparableInvoice(invoice: Invoice): ComparableInvoice {
  return {
    id: invoice.id,
    title: invoice.title,
    issuer_id: invoice.seller,
    issuer_name: invoice.seller,
    face_value: invoice.amount,
    yield_bps: invoice.yield_bps ?? 0,
    maturity_date: invoice.due_date,
    status: invoice.status,
    raised: invoice.raised ?? 0,
    investor_count: invoice.investor_count ?? 0,
    issuer_score: invoice.issuer_score ?? null,
  };
}

/** Percentage of face value funded, clamped to 0-100. */
export function compareFundingPercent(invoice: ComparableInvoice): number {
  if (!invoice.face_value || invoice.face_value <= 0) return 0;
  return Math.min(Math.max((invoice.raised / invoice.face_value) * 100, 0), 100);
}

/** True while the invoice can still be invested in. */
export function isInvestable(invoice: ComparableInvoice, now: Date = new Date()): boolean {
    if (invoice.status !== "open") return false;
    return new Date(invoice.maturity_date).getTime() > now.getTime();
}

/** Adds an item, ignoring duplicates and honouring {@link MAX_COMPARE_ITEMS}. */
export function addToComparison(
    current: ComparableInvoice[],
    invoice: ComparableInvoice,
    max = MAX_COMPARE_ITEMS
): ComparableInvoice[] {
    if (current.some((item) => item.id === invoice.id)) {
        return current;
    }
    if (current.length >= max) {
        return current;
    }
    return [...current, invoice];
}

/** Removes an item by id, preserving the order of the remaining items. */
export function removeFromComparison(
    current: ComparableInvoice[],
    id: string
): ComparableInvoice[] {
    return current.filter((item) => item.id !== id);
}
