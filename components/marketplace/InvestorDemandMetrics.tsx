"use client";

import { Minus, TrendingUp, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useInvoiceDemandMetrics } from "@/hooks/useInvoiceDemandMetrics";
import {
  velocityClassName,
  velocityLabel,
  velocityState,
  type VelocityState,
} from "@/lib/fundingVelocity";

interface InvestorDemandMetricsProps {
  invoiceId: string;
  /**
   * Fallback for the count before the first poll lands, and the only source
   * when the demand endpoint is unavailable. The API value wins once it
   * arrives.
   */
  investorCountFallback?: number;
  className?: string;
}

const STATE_ICON: Record<VelocityState, typeof TrendingUp> = {
  trending: TrendingUp,
  steady: Minus,
  slow: Minus,
};

/**
 * Unique-investor count and funding-velocity badge for an invoice (#422).
 *
 * Reads only from the polled demand-metrics endpoint, so the count is the
 * API's figure rather than a locally tallied one — the same value on the card
 * and on the detail page.
 */
export function InvestorDemandMetrics({
  invoiceId,
  investorCountFallback,
  className = "",
}: InvestorDemandMetricsProps) {
  const { data } = useInvoiceDemandMetrics({ invoiceId });

  const investorCount = data?.investor_count ?? investorCountFallback ?? 0;

  const state = data
    ? velocityState({
        raisedLast24h: data.raised_last_24h,
        raised: data.raised,
        fundedAt: data.funded_at,
      })
    : null;

  const Icon = state ? STATE_ICON[state] : null;

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${className}`}
      data-testid="investor-demand-metrics"
    >
      <span
        className="inline-flex items-center gap-1 text-sm text-muted-foreground"
        data-testid="investor-count"
        aria-label={`${investorCount} investors`}
      >
        <Users className="size-3.5" aria-hidden="true" />
        {investorCount}
      </span>

      {/*
        No velocity badge at all until the first poll resolves, rather than a
        placeholder: showing "slow" and then flipping it to "trending" a moment
        later reads as a real change, which is the flicker the brief rules out.
      */}
      {state && Icon && (
        <Badge
          variant="outline"
          className={`gap-1 text-xs ${velocityClassName(state)}`}
          data-testid="velocity-badge"
          data-velocity={state}
        >
          <Icon className="size-3" aria-hidden="true" />
          {velocityLabel(state)}
        </Badge>
      )}
    </div>
  );
}
