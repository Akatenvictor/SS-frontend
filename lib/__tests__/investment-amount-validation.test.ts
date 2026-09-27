import { describe, it, expect } from "vitest";
import {
    validateInvestmentAmount,
    belowMinimumError,
    INVALID_AMOUNT_ERROR,
    ABOVE_CAPACITY_ERROR,
} from "../validation/investment-amount";

describe("validateInvestmentAmount", () => {
    const min = 100;
    const max = 5000;

    it("returns an error when the amount is below the minimum", () => {
        expect(validateInvestmentAmount("50", min, max)).toBe(belowMinimumError(min));
    });

    it("includes the actual minimum value in the error message (issue #116)", () => {
        expect(validateInvestmentAmount("10", 250, max)).toBe("Minimum investment is 250 XLM");
    });

    it("returns an error when the amount exceeds the remaining capacity", () => {
        expect(validateInvestmentAmount("5001", min, max)).toBe(ABOVE_CAPACITY_ERROR);
    });

    it("passes validation when the amount exactly equals the minimum", () => {
        expect(validateInvestmentAmount("100", min, max)).toBeNull();
    });

    it("passes validation when the amount exactly equals the remaining capacity", () => {
        expect(validateInvestmentAmount("5000", min, max)).toBeNull();
    });

    it("returns an error for a non-numeric value", () => {
        expect(validateInvestmentAmount("abc", min, max)).toBe(INVALID_AMOUNT_ERROR);
    });

    it("returns an error for an empty value", () => {
        expect(validateInvestmentAmount("", min, max)).toBe(INVALID_AMOUNT_ERROR);
    });

    it("passes validation for a value strictly between the min and max", () => {
        expect(validateInvestmentAmount("2500", min, max)).toBeNull();
    });
});
