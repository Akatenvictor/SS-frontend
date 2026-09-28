"use client";

/**
 * Funding-velocity maths (#422)
 *
 * Turns a listing's 24-hour funding figures into a three-state badge. Pure and
 * React-free so the threshold boundaries — where off-by-one decides whether an
 * invoice reads "trending" or "steady" — can be tested directly.
 */

export const VELOCITY_STATES = ["trending", "steady", "slow"] as const;
export type VelocityState = (typeof VELOCITY_STATES)[number];

/** Percent raised over 24h at or above which an invoice reads as trending. */
export const TRENDING_THRESHOLD_PCT = 10;
/** Percent raised over 24h at or above which an invoice is more than slow. */
export const STEADY_THRESHOLD_PCT = 1;

/** A listing younger than this has no meaningful 24h trend yet. */
export const MIN_VELOCITY_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface VelocityInput {
  /** Face value committed in the last 24 hours. */
  raisedLast24h: number;
  /** Total face value committed so far. */
  raised: number;
  /** When the invoice was funded, or `null` while it is still open. */
  fundedAt?: string | null;
}

/**
 * Share of the invoice funded in the last 24 hours, as a percentage of total
 * raised. Returned as a ratio in 0–100 (i.e. already multiplied by 100).
 *
 * An invoice that has raised nothing yields 0 rather than NaN: a `NaN` badge
 * is worse than a "slow" one, and a zero-raise invoice is not moving.
 */
export function velocityPercent(input: VelocityInput): number {
  const { raisedLast24h, raised } = input;
  if (!Number.isFinite(raisedLast24h) || !Number.isFinite(raised)) return 0;
  if (!(raised > 0)) return 0;
  if (!(raisedLast24h > 0)) return 0;
  return (raisedLast24h / raised) * 100;
}

/**
 * The badge state for a listing.
 *
 * Boundaries are inclusive at the threshold, matching how the thresholds are
 * written: ">10% is trending" reads 10% as the first trending value, and
 * "1–10% is steady" reads 1% as the first steady one.
 *
 * An invoice that was funded less than 24 hours ago returns `null`. A partial
 * day of funding would otherwise be extrapolated into a full-day rate and shown
 * as inflated demand — the badge is suppressed rather than guessed, since the
 * funding bar next to it already communicates the real progress.
 */
export function velocityState(
  input: VelocityInput,
  now: number = Date.now()
): VelocityState | null {
  if (!hasFullVelocityWindow(input, now)) return null;

  const pct = velocityPercent(input);
  if (pct >= TRENDING_THRESHOLD_PCT) return "trending";
  if (pct >= STEADY_THRESHOLD_PCT) return "steady";
  return "slow";
}

/** True once the invoice has been funded for at least a full 24h window. */
export function hasFullVelocityWindow(
  input: Pick<VelocityInput, "fundedAt">,
  now: number = Date.now()
): boolean {
  const fundedAt = input.fundedAt;
  // A still-open invoice has no funding date. It has no "funding velocity" in
  // the sense this badge means — the figure would just be the run-up to full
  // funding — so the badge is suppressed rather than shown as permanently
  // trending.
  if (!fundedAt) return false;

  const fundedAtMs = new Date(fundedAt).getTime();
  if (Number.isNaN(fundedAtMs)) return false;
  return now - fundedAtMs >= MIN_VELOCITY_WINDOW_MS;
}

const STATE_LABELS: Record<VelocityState, string> = {
  trending: "Trending",
  steady: "Steady",
  slow: "Slow",
};

export function velocityLabel(state: VelocityState): string {
  return STATE_LABELS[state];
}

/**
 * Tailwind classes per state: green for trending demand, amber for steady,
 * grey for slow.
 *
 * The colour is applied on the badge itself with `border-*`/`bg-*`/`text-*` so
 * it survives the dark-mode variables in `globals.css` rather than being
 * hardcoded to one palette.
 */
const STATE_CLASSES: Record<VelocityState, string> = {
  trending:
    "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400",
  steady:
    "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  slow: "border-muted bg-muted/50 text-muted-foreground",
};

export function velocityClassName(state: VelocityState): string {
  return STATE_CLASSES[state];
}
