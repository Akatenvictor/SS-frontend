"use client";

import { useEffect, useMemo, useState } from "react";
import {
  computeSettlementCountdown,
  type SettlementCountdown,
} from "@/lib/settlementCountdown";

/**
 * Aligns the first tick to the next whole second rather than firing at an
 * arbitrary offset from mount, so every countdown on a page flips its seconds
 * digit at the same moment instead of drifting apart.
 */
function msToNextSecond(): number {
  return 1000 - (Date.now() % 1000);
}

interface UseSettlementCountdownOptions {
  maturityDate: string | null | undefined;
  settledAt?: string | null;
  /**
   * Tick interval. Cards use a minute — a seconds digit on a dense grid is
   * noise. The detail page passes 1000 for a live seconds display.
   */
  intervalMs?: number;
  enabled?: boolean;
}

/**
 * Live countdown to maturity, plus the settled and overdue states (#423).
 *
 * A settled invoice stops ticking entirely: the badge it shows is a date, not
 * a clock, and leaving the interval running would re-render it forever for no
 * visible change.
 */
export function useSettlementCountdown({
  maturityDate,
  settledAt,
  intervalMs = 60_000,
  enabled = true,
}: UseSettlementCountdownOptions): SettlementCountdown | null {
  const [now, setNow] = useState(() => Date.now());

  const isSettled = Boolean(settledAt);
  const isOverdueNow = useMemo(
    () =>
      computeSettlementCountdown(maturityDate, settledAt, Date.now())?.state ===
      "overdue",
    [maturityDate, settledAt]
  );

  useEffect(() => {
    if (!enabled || !maturityDate) return;
    // Nothing left to count: either settled, or already past maturity and
    // waiting on the settlement to be recorded.
    if (isSettled || isOverdueNow) return;

    let interval: ReturnType<typeof setTimeout>;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
      interval = setTimeout(() => {
        setNow(Date.now());
        schedule();
      }, intervalMs);
    };

    if (intervalMs >= 1000) {
      timeout = setTimeout(() => {
        setNow(Date.now());
        schedule();
      }, msToNextSecond());
    } else {
      schedule();
    }

    return () => {
      if (timeout) clearTimeout(timeout);
      clearTimeout(interval);
    };
  }, [enabled, intervalMs, isOverdueNow, isSettled, maturityDate]);

  return useMemo(
    () => computeSettlementCountdown(maturityDate, settledAt, now),
    [maturityDate, now, settledAt]
  );
}
