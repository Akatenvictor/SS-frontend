"use client";

/**
 * Price impact calculation for investments (issue #344).
 *
 * Backend formula: impact = (investmentAmount / fundingCap) * 100.
 * Represents how much of the funding cap a single investment would take.
 */

export const PRICE_IMPACT_WARNING_THRESHOLD = 5;
export const PRICE_IMPACT_HIGH_THRESHOLD = 10;

export function calculatePriceImpact(
  investmentAmount: number,
  fundingCap: number
): number {
  if (!Number.isFinite(investmentAmount) || !Number.isFinite(fundingCap)) return 0;
  if (fundingCap <= 0 || investmentAmount <= 0) return 0;
  const impact = (investmentAmount / fundingCap) * 100;
  // Round to 2 decimals for display stability.
  return Math.round(impact * 100) / 100;
}

export function getPriceImpactLevel(impact: number): "none" | "warning" | "high" {
  if (impact > PRICE_IMPACT_HIGH_THRESHOLD) return "high";
  if (impact > PRICE_IMPACT_WARNING_THRESHOLD) return "warning";
  return "none";
}
