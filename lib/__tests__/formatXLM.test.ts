import { describe, it, expect } from "vitest";
import { formatXLM } from "../format";

describe("formatXLM amount formatter", () => {
  it("formats 10000 XLM with thousand separators and 2 decimal places", () => {
    expect(formatXLM(10000)).toBe("10,000.00 XLM");
  });

  it("formats 0 XLM as '0.00 XLM'", () => {
    expect(formatXLM(0)).toBe("0.00 XLM");
  });

  it("formats fractional amounts (0.5 XLM) to 2 decimal places ('0.50 XLM')", () => {
    expect(formatXLM(0.5)).toBe("0.50 XLM");
  });

  it("formats large numbers (1000000 XLM) with thousand separators ('1,000,000.00 XLM')", () => {
    expect(formatXLM(1000000)).toBe("1,000,000.00 XLM");
  });

  it("formats negative values with a leading minus sign ('-500.00 XLM')", () => {
    expect(formatXLM(-500)).toBe("-500.00 XLM");
  });

  it("handles string inputs cleanly", () => {
    expect(formatXLM("10000")).toBe("10,000.00 XLM");
    expect(formatXLM("0.5")).toBe("0.50 XLM");
    expect(formatXLM("-500")).toBe("-500.00 XLM");
  });

  it("avoids floating-point representation rounding errors", () => {
    expect(formatXLM(0.1 + 0.2)).toBe("0.30 XLM");
    expect(formatXLM(1234.5678)).toBe("1,234.57 XLM");
  });

  it("handles invalid or NaN inputs gracefully with fallback", () => {
    expect(formatXLM("invalid")).toBe("0.00 XLM");
  });
});
