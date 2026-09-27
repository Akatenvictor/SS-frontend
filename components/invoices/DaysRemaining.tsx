"use client";

/**
 * Days remaining (issue #376)
 *
 * Surfaced next to the status badge in the invoice header. A non-trading
 * invoice — settled, rejected or draft — has no countdown, so nothing is
 * shown rather than a misleading "0 days left".
 */

import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Statuses for which a funding countdown is meaningless. */
const NON_TRADING_STATUSES = new Set(["settled", "rejected", "draft"]);

export function daysRemaining(dueDate: string, now: number = Date.now()): number {
  const due = new Date(dueDate).getTime();
  if (Number.isNaN(due)) return 0;
  return Math.max(0, Math.ceil((due - now) / MS_PER_DAY));
}

interface DaysRemainingBadgeProps {
  dueDate: string;
  status: string;
  now?: number;
}

export function DaysRemainingBadge({ dueDate, status, now }: DaysRemainingBadgeProps) {
  if (NON_TRADING_STATUSES.has(status)) return null;

  const days = daysRemaining(dueDate, now);
  const isUrgent = days <= 7;

  return (
    <span
      data-testid="days-remaining"
      data-days={days}
      title={new Date(dueDate).toLocaleDateString()}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        isUrgent
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "text-muted-foreground"
      )}
    >
      <Clock className="h-3 w-3" />
      {days === 0 ? "Closing today" : `${days} ${days === 1 ? "day" : "days"} remaining`}
    </span>
  );
}
