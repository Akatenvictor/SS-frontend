/**
 * Investor risk-profile questionnaire and suitability gating (#391).
 *
 * Each answer carries a score (0 = most cautious). The total across the four
 * questions maps to a suitability tier, and each invoice risk grade requires a
 * minimum tier before the invest action is enabled.
 */

export type SuitabilityTier = "conservative" | "moderate" | "aggressive";
export type InvoiceRiskGrade = "A" | "B" | "C" | "D";

export type QuestionId = "experience" | "tolerance" | "income" | "horizon";

export interface QuestionOption {
  value: string;
  label: string;
  score: number;
}

export interface Question {
  id: QuestionId;
  title: string;
  options: QuestionOption[];
}

export const QUESTIONS: Question[] = [
  {
    id: "experience",
    title: "How much investment experience do you have?",
    options: [
      { value: "none", label: "None or very little", score: 0 },
      { value: "some", label: "Some (stocks, funds)", score: 1 },
      { value: "extensive", label: "Extensive (credit, crypto, private markets)", score: 2 },
    ],
  },
  {
    id: "tolerance",
    title: "If an investment dropped 20% in value, what would you do?",
    options: [
      { value: "sell", label: "Sell to avoid further losses", score: 0 },
      { value: "hold", label: "Hold and wait", score: 1 },
      { value: "buy", label: "Invest more", score: 2 },
    ],
  },
  {
    id: "income",
    title: "What share of your annual income could you lose without hardship?",
    options: [
      { value: "under5", label: "Less than 5%", score: 0 },
      { value: "5to15", label: "5% to 15%", score: 1 },
      { value: "over15", label: "More than 15%", score: 2 },
    ],
  },
  {
    id: "horizon",
    title: "How long can you keep funds invested?",
    options: [
      { value: "short", label: "Less than 3 months", score: 0 },
      { value: "medium", label: "3 to 12 months", score: 1 },
      { value: "long", label: "More than 12 months", score: 2 },
    ],
  },
];

export type Answers = Partial<Record<QuestionId, string>>;

const MAX_SCORE = QUESTIONS.length * 2; // 8

/** True when every question has a valid answer. */
export function isComplete(answers: Answers): boolean {
  return QUESTIONS.every((q) => q.options.some((o) => o.value === answers[q.id]));
}

/** Sum of option scores; throws if any question is unanswered or invalid. */
export function scoreAnswers(answers: Answers): number {
  return QUESTIONS.reduce((total, q) => {
    const option = q.options.find((o) => o.value === answers[q.id]);
    if (!option) throw new Error(`Missing or invalid answer for "${q.id}"`);
    return total + option.score;
  }, 0);
}

/**
 * Score bands (0..8): 0-2 conservative, 3-5 moderate, 6-8 aggressive.
 * A "sell on a 20% drop" answer caps the tier at moderate: an investor who
 * would panic-sell is never classed aggressive.
 */
export function computeSuitabilityTier(answers: Answers): SuitabilityTier {
  const score = scoreAnswers(answers);
  let tier: SuitabilityTier =
    score <= 2 ? "conservative" : score <= 5 ? "moderate" : "aggressive";
  if (answers.tolerance === "sell" && tier === "aggressive") tier = "moderate";
  return tier;
}

export { MAX_SCORE };

const TIER_RANK: Record<SuitabilityTier, number> = {
  conservative: 0,
  moderate: 1,
  aggressive: 2,
};

/** Minimum investor tier for each invoice risk grade (A = safest). */
export const REQUIRED_TIER: Record<InvoiceRiskGrade, SuitabilityTier> = {
  A: "conservative",
  B: "conservative",
  C: "moderate",
  D: "aggressive",
};

/**
 * Whether an investor may invest in an invoice of the given risk grade.
 * Unrated invoices are not gated. Investors without a completed profile are
 * treated as conservative until they take the questionnaire.
 */
export function canInvestInGrade(
  tier: SuitabilityTier | null | undefined,
  grade: InvoiceRiskGrade | null | undefined,
): boolean {
  if (!grade) return true;
  const effective = tier ?? "conservative";
  return TIER_RANK[effective] >= TIER_RANK[REQUIRED_TIER[grade]];
}

export const TIER_LABELS: Record<SuitabilityTier, string> = {
  conservative: "Conservative",
  moderate: "Moderate",
  aggressive: "Aggressive",
};

// ── Persistence (investor profile, client-side) ──────────────────────────────

export const SUITABILITY_STORAGE_KEY = "ss-suitability-tier";
export const SUITABILITY_CHANGE_EVENT = "ss-suitability-change";

function isTier(v: unknown): v is SuitabilityTier {
  return v === "conservative" || v === "moderate" || v === "aggressive";
}

export function loadSuitabilityTier(): SuitabilityTier | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SUITABILITY_STORAGE_KEY);
    return isTier(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function saveSuitabilityTier(tier: SuitabilityTier): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SUITABILITY_STORAGE_KEY, tier);
  } catch {
    // storage unavailable: tier still applies for this session via the event
  }
  window.dispatchEvent(new CustomEvent(SUITABILITY_CHANGE_EVENT, { detail: tier }));
}
