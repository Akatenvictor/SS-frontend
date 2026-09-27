import { describe, expect, it, beforeEach } from "vitest";
import {
  QUESTIONS,
  canInvestInGrade,
  computeSuitabilityTier,
  isComplete,
  loadSuitabilityTier,
  saveSuitabilityTier,
  scoreAnswers,
  type Answers,
  type SuitabilityTier,
} from "../suitability";

/** Every combination of answers (3^4 = 81). */
function allCombinations(): Answers[] {
  let combos: Answers[] = [{}];
  for (const q of QUESTIONS) {
    combos = combos.flatMap((a) => q.options.map((o) => ({ ...a, [q.id]: o.value })));
  }
  return combos;
}

describe("computeSuitabilityTier", () => {
  it("covers every answer combination with the expected band", () => {
    const combos = allCombinations();
    expect(combos).toHaveLength(81);
    for (const answers of combos) {
      const score = scoreAnswers(answers);
      let expected: SuitabilityTier =
        score <= 2 ? "conservative" : score <= 5 ? "moderate" : "aggressive";
      if (answers.tolerance === "sell" && expected === "aggressive") expected = "moderate";
      expect(computeSuitabilityTier(answers)).toBe(expected);
    }
  });

  it("maps the extremes", () => {
    expect(
      computeSuitabilityTier({ experience: "none", tolerance: "sell", income: "under5", horizon: "short" }),
    ).toBe("conservative");
    expect(
      computeSuitabilityTier({ experience: "extensive", tolerance: "buy", income: "over15", horizon: "long" }),
    ).toBe("aggressive");
  });

  it("caps panic-sellers at moderate", () => {
    expect(
      computeSuitabilityTier({ experience: "extensive", tolerance: "sell", income: "over15", horizon: "long" }),
    ).toBe("moderate");
  });

  it("rejects incomplete answers", () => {
    expect(isComplete({ experience: "none" })).toBe(false);
    expect(() => computeSuitabilityTier({ experience: "none" })).toThrow(/Missing or invalid answer/);
  });
});

describe("canInvestInGrade", () => {
  it("does not gate unrated invoices", () => {
    expect(canInvestInGrade(null, undefined)).toBe(true);
  });

  it("gates grades by minimum tier", () => {
    expect(canInvestInGrade("conservative", "A")).toBe(true);
    expect(canInvestInGrade("conservative", "B")).toBe(true);
    expect(canInvestInGrade("conservative", "C")).toBe(false);
    expect(canInvestInGrade("moderate", "C")).toBe(true);
    expect(canInvestInGrade("moderate", "D")).toBe(false);
    expect(canInvestInGrade("aggressive", "D")).toBe(true);
  });

  it("treats a missing profile as conservative", () => {
    expect(canInvestInGrade(null, "B")).toBe(true);
    expect(canInvestInGrade(null, "C")).toBe(false);
  });
});

describe("suitability persistence", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips and overwrites on retake", () => {
    expect(loadSuitabilityTier()).toBeNull();
    saveSuitabilityTier("moderate");
    expect(loadSuitabilityTier()).toBe("moderate");
    saveSuitabilityTier("aggressive");
    expect(loadSuitabilityTier()).toBe("aggressive");
  });

  it("ignores corrupt stored values", () => {
    localStorage.setItem("ss-suitability-tier", "yolo");
    expect(loadSuitabilityTier()).toBeNull();
  });
});
