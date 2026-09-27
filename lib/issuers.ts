/**
 * Issuer domain model and reputation scoring.
 *
 * Kept free of React and network concerns so the scoring maths is unit
 * testable in isolation (see `lib/__tests__/issuers.test.ts`).
 */

/** How a matured invoice ultimately resolved. */
export type SettlementOutcome = "on_time" | "late" | "defaulted";

/** KYC gate that drives whether an issuer may display a verified badge. */
export type KycStatus = "approved" | "pending" | "rejected";

export type IssuerInvoiceStatus =
  | "draft"
  | "open"
  | "funded"
  | "settled"
  | "rejected";

export interface IssuerSettlement {
  invoice_id: string;
  maturity_date: string;
  /** Null while the invoice has not settled yet. */
  settled_at: string | null;
  outcome: SettlementOutcome | null;
}

export interface IssuerInvoice {
  id: string;
  title: string;
  issuer_id: string;
  /** Face value in XLM. */
  face_value: number;
  /** Annualised yield as a percentage (8.25 === 8.25%). */
  yield_percentage: number;
  status: IssuerInvoiceStatus;
  maturity_date: string;
  raised: number;
  investor_count: number;
  settlement: IssuerSettlement | null;
}

export interface IssuerProfile {
  id: string;
  name: string;
  kyc_status: KycStatus;
  member_since: string;
  /** Lifetime amount funded by investors, in XLM. */
  total_funded: number;
  invoices: IssuerInvoice[];
}

export interface ReputationScore {
  /** 0-100, rounded to a whole number. */
  score: number;
  /** Percentage of settled invoices repaid on or before maturity, 0-100. */
  onTimeRate: number;
  /** Settled invoices considered by the score. */
  settledCount: number;
  onTimeCount: number;
  lateCount: number;
  defaultedCount: number;
  /** Every invoice the issuer has ever published, settled or not. */
  totalInvoiceCount: number;
  label: ReputationLabel;
  /** False until the issuer has a settled invoice to score. */
  hasTrackRecord: boolean;
}

export type ReputationLabel = "no-track-record" | "poor" | "fair" | "good" | "excellent";

/** Settled invoices needed before the track-record component reaches its cap. */
const TRACK_RECORD_TARGET = 5;

/**
 * Share of the score driven by settlement punctuality, and by history depth.
 *
 * Punctuality carries the majority so an issuer is primarily graded on whether
 * they actually pay on time; history depth only breaks ties, which keeps a
 * single perfect settlement from reading as "excellent".
 */
const PUNCTUALITY_WEIGHT = 70;
const TRACK_RECORD_WEIGHT = 30;

/** An issuer must clear this to show the verified badge, independent of score. */
export function isKycApproved(issuer: Pick<IssuerProfile, "kyc_status">): boolean {
  return issuer.kyc_status === "approved";
}

function labelForScore(score: number, hasTrackRecord: boolean): ReputationLabel {
  if (!hasTrackRecord) return "no-track-record";
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "fair";
  return "poor";
}

/**
 * Derives an issuer's reputation from their settlement history.
 *
 * An invoice only counts toward punctuality once it has settled — an invoice
 * that is still funding is neither evidence for nor against the issuer, so it
 * is excluded from the numerator and the denominator. Defaulted invoices count
 * as settled but not on time.
 *
 * The score is 70% settlement punctuality plus 30% history depth (capped at
 * {@link TRACK_RECORD_TARGET} settled invoices), so a single lucky settlement
 * cannot outrank an issuer with a long clean record.
 */
export function computeReputationScore(invoices: IssuerInvoice[]): ReputationScore {
  // Optional chaining yields `undefined` (not `null`) when settlement is absent,
  // so normalise it before comparing or every unscored invoice would qualify.
  const settled = invoices.filter(
    (invoice) =>
      invoice.status === "settled" || (invoice.settlement?.outcome ?? null) !== null
  );

  const onTimeCount = settled.filter(
    (invoice) => invoice.settlement?.outcome === "on_time"
  ).length;
  const defaultedCount = settled.filter(
    (invoice) => invoice.settlement?.outcome === "defaulted"
  ).length;
  const lateCount = settled.length - onTimeCount - defaultedCount;

  const settledCount = settled.length;
  const onTimeRate = settledCount > 0 ? (onTimeCount / settledCount) * 100 : 0;

  const punctuality = (onTimeRate / 100) * PUNCTUALITY_WEIGHT;
  const trackRecord =
    (Math.min(settledCount, TRACK_RECORD_TARGET) / TRACK_RECORD_TARGET) *
    TRACK_RECORD_WEIGHT;

  const score = Math.max(0, Math.min(100, Math.round(punctuality + trackRecord)));
  const hasTrackRecord = settledCount > 0;

  return {
    score,
    onTimeRate: Math.round(onTimeRate * 10) / 10,
    settledCount,
    onTimeCount,
    lateCount: Math.max(0, lateCount),
    defaultedCount,
    totalInvoiceCount: invoices.length,
    label: labelForScore(score, hasTrackRecord),
    hasTrackRecord,
  };
}

/** Percentage of face value already committed, clamped to 0-100. */
export function fundingProgressPercent(invoice: Pick<IssuerInvoice, "raised" | "face_value">): number {
  if (!invoice.face_value || invoice.face_value <= 0) return 0;
  return Math.min(Math.max((invoice.raised / invoice.face_value) * 100, 0), 100);
}

/** True while an invoice is still publicly listed and accepting investment. */
export function isOpenForInvestment(
  invoice: Pick<IssuerInvoice, "status" | "maturity_date">,
  now: Date = new Date()
): boolean {
  if (invoice.status !== "open") return false;
  return new Date(invoice.maturity_date).getTime() > now.getTime();
}

/** Invoices still listed for investment, soonest maturity first. */
export function selectActiveInvoices(invoices: IssuerInvoice[], now: Date = new Date()): IssuerInvoice[] {
  return invoices
    .filter((invoice) => isOpenForInvestment(invoice, now))
    .sort(
      (a, b) =>
        new Date(a.maturity_date).getTime() - new Date(b.maturity_date).getTime()
    );
}

/** Settled invoices, most recently settled first — the repayment track record. */
export function selectSettledInvoices(invoices: IssuerInvoice[]): IssuerInvoice[] {
  return invoices
    .filter((invoice) => invoice.status === "settled" || invoice.settlement !== null)
    .sort((a, b) => {
      const aTime = a.settlement?.settled_at
        ? new Date(a.settlement.settled_at).getTime()
        : 0;
      const bTime = b.settlement?.settled_at
        ? new Date(b.settlement.settled_at).getTime()
        : 0;
      return bTime - aTime;
    });
}

/** Human label for a settlement outcome. */
export function settlementOutcomeLabel(
  outcome: SettlementOutcome | null | undefined
): string {
  switch (outcome) {
    case "on_time":
      return "Paid on time";
    case "late":
      return "Paid late";
    case "defaulted":
      return "Defaulted";
    default:
      return "Awaiting settlement";
  }
}

/** ISO timestamp -> "12 Mar 2026", stable across locales via explicit options. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** "member since" copy: March 2024. */
export function formatMemberSince(iso: string | null | undefined): string {
  if (!iso) return "Unknown";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}
