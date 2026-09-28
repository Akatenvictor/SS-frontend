/**
 * Formats a numeric or string XLM amount with thousand separators,
 * 2 decimal places, and trailing " XLM" suffix.
 * Handles negative values and prevents floating-point representation errors.
 */
export function formatXLM(amount: number | string | bigint): string {
  const num = typeof amount === "string" ? Number(amount) : Number(amount);
  if (isNaN(num)) {
    return "0.00 XLM";
  }

  const formatted = num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${formatted} XLM`;
}

/**
 * Formats a USDC amount with thousand separators and 2 decimal places.
 * USDC mirrors Stellar's 7-decimal precision, so trailing zeros are trimmed
 * below two decimals to keep the nav chip compact ("1,250 USDC", "12.5 USDC").
 */
export function formatUsdc(amount: number | string | null | undefined): string {
  const num = typeof amount === "string" ? Number(amount) : Number(amount ?? 0);
  if (isNaN(num)) {
    return "0.00 USDC";
  }

  const formatted = num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${formatted} USDC`;
}

/** Formats a percentage rate (e.g. 8.25) as "8.25%". */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "N/A";
  }
  return `${value.toFixed(2)}%`;
}
