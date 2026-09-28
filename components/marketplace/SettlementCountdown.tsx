"use client";

import { memo } from "react";
import { CheckCircle2, Clock, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSettlementCountdown } from "@/hooks/useSettlementCountdown";
import {
  formatCompactCountdown,
  formatFullCountdown,
  formatSettlementDate,
} from "@/lib/settlementCountdown";

interface SettlementCountdownProps {
  /** Server-side maturity timestamp. The source of truth for the countdown. */
  maturityDate: string | null | undefined;
  /** Present once the invoice has settled; replaces the countdown. */
  settledAt?: string | null;
  /** `"card"` shows DD:HH:MM, `"detail"` adds seconds. */
  variant?: "card" | "detail";
  /** Show the verbose day/hour/minute breakdown beside the digits. */
  labelled?: boolean;
  className?: string;
}

/**
 * Live countdown to maturity, with settled and overdue states (#423).
 *
 * Memoised and driven by a self-contained tick: the seconds interval re-renders
 * this component only, never the card or grid around it. A marketplace page
 * holding 25 cards would otherwise re-render the whole list 25 times a second,
 * because every countdown's tick invalidated the shared parent.
 */
export const SettlementCountdown = memo(function SettlementCountdown({
  maturityDate,
  settledAt,
  variant = "card",
  labelled = false,
  className = "",
}: SettlementCountdownProps) {
  const countdown = useSettlementCountdown({
    maturityDate,
    settledAt,
    // Cards tick per minute; only the detail page shows a live seconds digit.
    intervalMs: variant === "detail" ? 1000 : 60_000,
  });

  if (!countdown) return null;

  if (countdown.state === "settled") {
    return (
      <Badge
        variant="outline"
        className={`gap-1 border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400 ${className}`}
        data-testid="settlement-settled-badge"
      >
        <CheckCircle2 className="size-3" aria-hidden="true" />
        Settled {formatSettlementDate(settledAt ?? "")}
      </Badge>
    );
  }

  if (countdown.state === "overdue") {
    return (
      <Badge
        variant="destructive"
        className={`gap-1 ${className}`}
        data-testid="settlement-overdue-badge"
      >
        <TriangleAlert className="size-3" aria-hidden="true" />
        {countdown.daysOverdue} day{countdown.daysOverdue === 1 ? "" : "s"} overdue
      </Badge>
    );
  }

  const text =
    variant === "detail"
      ? formatFullCountdown(countdown.parts)
      : formatCompactCountdown(countdown.parts);

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-sm text-muted-foreground ${className}`}
      data-testid="settlement-countdown"
      data-state="counting"
    >
      <Clock className="size-3.5" aria-hidden="true" />
      <span className="font-mono tabular-nums" data-testid="settlement-countdown-value">
        {text}
      </span>
      {labelled && (
        <span className="hidden text-xs sm:inline">
          {countdown.parts.days}d {countdown.parts.hours}h {countdown.parts.minutes}m
        </span>
      )}
      <span className="sr-only">
        {`${countdown.parts.days} days, ${countdown.parts.hours} hours and ${countdown.parts.minutes} minutes until settlement`}
      </span>
    </span>
  );
});
