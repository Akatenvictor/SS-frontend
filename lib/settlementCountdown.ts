"use client";

/**
 * Settlement-countdown maths (#423)
 *
 * The countdown is measured against the server-supplied maturity timestamp, so
 * a client with a skewed clock cannot show an invoice as settled early or hold
 * it open past maturity. This module only does the arithmetic; the ticking
 * lives in `hooks/useSettlementCountdown`.
 */

/**
 * Countdown maths runs in whole seconds end to end, so seconds are the only
 * unit the module converts in. An earlier version derived these from
 * millisecond constants and mixed the two, which silently produced a minutes
 * field that counted seconds.
 */
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;
const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** Signed seconds to maturity; negative once past. */
  totalSeconds: number;
}

export type CountdownState = "counting" | "settled" | "overdue";

export interface SettlementCountdown {
  parts: CountdownParts;
  state: CountdownState;
  /** Whole days past maturity; 0 unless overdue. */
  daysOverdue: number;
}

/**
 * Countdown to `maturityDate`, or the settled/overdue state around it.
 *
 * A settled invoice is settled regardless of the clock — the settlement
 * timestamp is the authority, not the maturity date. An invoice can settle
 * early, and once it has, a countdown to a maturity date in the future would
 * be actively misleading.
 *
 * An unparseable or missing maturity date counts down to zero rather than
 * producing NaN output; `null` is returned so the caller can render nothing
 * rather than a broken "NaN days".
 */
export function computeSettlementCountdown(
  maturityDate: string | null | undefined,
  settledAt: string | null | undefined,
  now: number = Date.now()
): SettlementCountdown | null {
  if (settledAt) {
    return {
      parts: { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 },
      state: "settled",
      daysOverdue: 0,
    };
  }

  const maturityMs = maturityDate ? new Date(maturityDate).getTime() : Number.NaN;
  if (Number.isNaN(maturityMs)) return null;

  const totalSeconds = Math.floor((maturityMs - now) / MS_PER_SECOND);

  if (totalSeconds <= 0) {
    const daysOverdue = Math.max(1, Math.floor(-totalSeconds / SECONDS_PER_DAY));
    return {
      parts: { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds },
      state: "overdue",
      daysOverdue,
    };
  }

  return {
    parts: splitCountdown(totalSeconds),
    state: "counting",
    daysOverdue: 0,
  };
}

/** Splits a positive second count into days/hours/minutes/seconds. */
export function splitCountdown(totalSeconds: number): CountdownParts {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  return {
    days: Math.floor(seconds / SECONDS_PER_DAY),
    hours: Math.floor((seconds % SECONDS_PER_DAY) / SECONDS_PER_HOUR),
    minutes: Math.floor((seconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE),
    seconds: seconds % SECONDS_PER_MINUTE,
    totalSeconds: seconds,
  };
}

/** True when the invoice has matured but has not been recorded as settled. */
export function isOverdue(
  maturityDate: string | null | undefined,
  settledAt: string | null | undefined,
  now: number = Date.now()
): boolean {
  return computeSettlementCountdown(maturityDate, settledAt, now)?.state === "overdue";
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** `DD:HH:MM` — the compact form for cards. */
export function formatCompactCountdown(parts: CountdownParts): string {
  return `${pad(parts.days)}:${pad(parts.hours)}:${pad(parts.minutes)}`;
}

/** `DD:HH:MM:SS` — the full form for the detail page. */
export function formatFullCountdown(parts: CountdownParts): string {
  return `${pad(parts.days)}:${pad(parts.hours)}:${pad(parts.minutes)}:${pad(parts.seconds)}`;
}

/** Localised settlement date for the "settled on" badge. */
export function formatSettlementDate(settledAt: string): string {
  const date = new Date(settledAt);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
