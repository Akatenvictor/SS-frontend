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
