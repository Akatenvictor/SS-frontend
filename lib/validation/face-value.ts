export const INVALID_AMOUNT_ERROR = "Please enter a valid amount";
export const ZERO_AMOUNT_ERROR = "Amount must be greater than zero";
export const BELOW_MINIMUM_INVOICE_ERROR = "Amount below minimum invoice size";

/** Default minimum face value (XLM) accepted when publishing an invoice. */
export const MIN_INVOICE_FACE_VALUE = 100;

/**
 * Validates a raw face-value input against the minimum invoice floor.
 * Returns an inline error message, or null when the amount is valid.
 */
export function validateFaceValue(
  rawValue: string,
  min: number = MIN_INVOICE_FACE_VALUE
): string | null {
  const trimmed = rawValue.trim();

  if (trimmed === "" || Number.isNaN(Number(trimmed))) {
    return INVALID_AMOUNT_ERROR;
  }

  const amount = Number(trimmed);

  if (amount <= 0) {
    return ZERO_AMOUNT_ERROR;
  }

  if (amount < min) {
    return BELOW_MINIMUM_INVOICE_ERROR;
  }

  return null;
}
