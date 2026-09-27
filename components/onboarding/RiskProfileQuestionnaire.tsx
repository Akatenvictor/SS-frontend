"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  QUESTIONS,
  TIER_LABELS,
  computeSuitabilityTier,
  type Answers,
  type SuitabilityTier,
} from "@/lib/suitability";

interface RiskProfileQuestionnaireProps {
  /** Called with the computed tier once the investor submits. */
  onComplete: (tier: SuitabilityTier) => void;
  onCancel?: () => void;
}

/** Multi-step investor risk-profile questionnaire (#391). */
export function RiskProfileQuestionnaire({ onComplete, onCancel }: RiskProfileQuestionnaireProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const isReview = step === QUESTIONS.length;
  const question = QUESTIONS[step];
  const answered = isReview || Boolean(question && answers[question.id]);

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Risk profile</CardTitle>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {isReview ? "Review" : `Question ${step + 1} of ${QUESTIONS.length}`}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isReview && question && (
          <fieldset className="space-y-2">
            <legend className="mb-2 font-medium">{question.title}</legend>
            {question.options.map((opt) => (
              <label key={opt.value} className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm">
                <input
                  type="radio"
                  name={question.id}
                  value={opt.value}
                  checked={answers[question.id] === opt.value}
                  onChange={() => setAnswers({ ...answers, [question.id]: opt.value })}
                />
                {opt.label}
              </label>
            ))}
          </fieldset>
        )}

        {isReview && (
          <div className="space-y-2 text-sm">
            <p>
              Your suitability tier:{" "}
              <strong data-testid="computed-tier">{TIER_LABELS[computeSuitabilityTier(answers)]}</strong>
            </p>
            <p className="text-muted-foreground">
              Invoices riskier than your tier will be shown as locked. You can retake this from your profile.
            </p>
          </div>
        )}

        <div className="flex justify-between pt-2">
          <Button
            variant="outline"
            onClick={() => (step === 0 ? onCancel?.() : setStep(step - 1))}
            disabled={step === 0 && !onCancel}
          >
            {step === 0 ? "Cancel" : "Back"}
          </Button>
          {isReview ? (
            <Button onClick={() => onComplete(computeSuitabilityTier(answers))}>Save profile</Button>
          ) : (
            <Button onClick={() => setStep(step + 1)} disabled={!answered}>
              Next
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
