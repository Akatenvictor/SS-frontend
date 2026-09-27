"use client";

import { AlertTriangle, OctagonAlert } from "lucide-react";
import { calculatePriceImpact, getPriceImpactLevel } from "@/lib/priceImpact";
import { cn } from "@/lib/utils";

interface PriceImpactWarningProps {
  amount: number | null;
  fundingCap: number;
}

/**
 * Price impact warning shown in the invest panel (issue #344).
 * - Displays impact % on every amount change.
 * - Warning banner above 5%, strong red warning above 10%.
 * - Hidden when amount is empty or below threshold.
 */
export function PriceImpactWarning({ amount, fundingCap }: PriceImpactWarningProps) {
  if (amount === null || amount <= 0 || fundingCap <= 0) return null;

  const impact = calculatePriceImpact(amount, fundingCap);
  const level = getPriceImpactLevel(impact);

  return (
    <div className="space-y-2">
      <p
        className="text-xs text-muted-foreground"
        data-testid="price-impact-percentage"
      >
        Price impact: {impact.toFixed(2)}%
      </p>

      {level === "warning" && (
        <div
          role="alert"
          data-testid="price-impact-warning"
          className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            This investment has a price impact of {impact.toFixed(2)}%. Large
            investments may move the price significantly.
          </span>
        </div>
      )}

      {level === "high" && (
        <div
          role="alert"
          data-testid="price-impact-warning-high"
          className={cn(
            "flex items-start gap-2 rounded-md border border-red-500 bg-red-50 p-3 text-sm text-red-800",
            "dark:bg-red-950/40 dark:text-red-300"
          )}
        >
          <OctagonAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            High price impact of {impact.toFixed(2)}%! This investment represents
            a large share of the funding cap. Proceed with caution.
          </span>
        </div>
      )}
    </div>
  );
}
