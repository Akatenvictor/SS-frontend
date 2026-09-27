import { describe, it, expect } from "vitest";
import {
  validateFaceValue,
  INVALID_AMOUNT_ERROR,
  ZERO_AMOUNT_ERROR,
  BELOW_MINIMUM_INVOICE_ERROR,
  MIN_INVOICE_FACE_VALUE,
} from "../validation/face-value";

describe("validateFaceValue", () => {
  const min = MIN_INVOICE_FACE_VALUE;

  it("returns an error for a non-numeric value", () => {
    expect(validateFaceValue("abc", min)).toBe(INVALID_AMOUNT_ERROR);
  });

  it("returns an error for an empty value", () => {
    expect(validateFaceValue("", min)).toBe(INVALID_AMOUNT_ERROR);
  });

  it("returns an error when the amount is zero", () => {
    expect(validateFaceValue("0", min)).toBe(ZERO_AMOUNT_ERROR);
  });

  it("returns an error when the amount is negative", () => {
    expect(validateFaceValue("-10", min)).toBe(ZERO_AMOUNT_ERROR);
  });

  it("returns an error when the amount is below the minimum invoice size", () => {
    expect(validateFaceValue("50", min)).toBe(BELOW_MINIMUM_INVOICE_ERROR);
  });

  it("passes validation when the amount exactly equals the minimum", () => {
    expect(validateFaceValue(String(min), min)).toBeNull();
  });

  it("passes validation for a value above the minimum", () => {
    expect(validateFaceValue("5000", min)).toBeNull();
  });
});
