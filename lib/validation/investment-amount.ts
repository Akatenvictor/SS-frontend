export const INVALID_AMOUNT_ERROR = "Please enter a valid amount";
export const ABOVE_CAPACITY_ERROR = "Amount exceeds available capacity";

/** Issue #116's exact requested copy: "Minimum investment is [X] XLM". */
export function belowMinimumError(min: number): string {
    return `Minimum investment is ${min} XLM`;
}

/**
 * Validates a raw investment amount input against the invoice's minimum
 * investment floor and remaining capacity. Returns an inline error message,
 * or null when the amount is valid.
 */
export function validateInvestmentAmount(
    rawValue: string,
    min: number,
    max: number
): string | null {
    const trimmed = rawValue.trim();

    if (trimmed === "" || Number.isNaN(Number(trimmed))) {
        return INVALID_AMOUNT_ERROR;
    }

    const amount = Number(trimmed);

    if (amount < min) {
        return belowMinimumError(min);
    }

    if (amount > max) {
        return ABOVE_CAPACITY_ERROR;
    }

    return null;
}
