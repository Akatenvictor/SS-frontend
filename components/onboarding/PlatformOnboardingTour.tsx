"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useOnboardingTour } from "@/hooks/useOnboardingTour";

interface TourStep {
  id: string;
  target: string;
  title: string;
  description: string;
}

export const ONBOARDING_TOUR_STEPS: TourStep[] = [
  {
    id: "marketplace",
    target: "marketplace",
    title: "Explore the marketplace",
    description:
      "Browse tokenized invoices, compare yields and find opportunities that match your strategy.",
  },
  {
    id: "invoice-detail",
    target: "invoice detail",
    title: "Review invoice details",
    description:
      "Open any invoice to inspect issuer info, financials, documents and funding progress.",
  },
  {
    id: "invest-button",
    target: "invest button",
    title: "Invest in one click",
    description:
      "Use the invest button on an invoice to commit funds once your wallet is connected.",
  },
  {
    id: "portfolio",
    target: "portfolio",
    title: "Track your portfolio",
    description:
      "Monitor positions, payouts and dividend earnings from your investor portfolio.",
  },
  {
    id: "notifications",
    target: "notifications",
    title: "Stay notified",
    description:
      "Enable notifications to hear about new listings, funding milestones and settlements.",
  },
];

/**
 * Interactive first-visit walkthrough (issue #349).
 * Auto-triggers for unauthenticated visitors, highlights each key area with
 * an overlay card, supports Skip/Next, persists completion to localStorage
 * and replays from the help centre.
 */
export function PlatformOnboardingTour() {
  const { address } = useAuth();
  const { isActive, currentStep, setCurrentStep, complete, skip } =
    useOnboardingTour(address !== null);

  const step = useMemo(
    () => ONBOARDING_TOUR_STEPS[Math.min(currentStep, ONBOARDING_TOUR_STEPS.length - 1)],
    [currentStep]
  );

  if (!isActive) return null;

  const isLast = currentStep === ONBOARDING_TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      complete();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      data-testid="onboarding-tour"
      role="dialog"
      aria-modal="true"
      aria-label="Platform onboarding tour"
    >
      <Card className="w-full max-w-md" data-testid={`onboarding-step-${step.id}`}>
        <CardHeader>
          <p className="text-xs text-muted-foreground" data-testid="onboarding-step-count">
            Step {currentStep + 1} of {ONBOARDING_TOUR_STEPS.length} · {step.target}
          </p>
          <h2 className="text-lg font-semibold" data-testid="onboarding-step-title">
            {step.title}
          </h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground" data-testid="onboarding-step-description">
            {step.description}
          </p>
          {/* Highlight hint: names the UI element this step refers to. */}
          <p className="text-xs text-muted-foreground" data-testid={`onboarding-highlight-${step.id}`}>
            Highlighting: {step.target}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={skip}
              className="flex-1"
              data-testid="onboarding-skip"
            >
              Skip
            </Button>
            <Button onClick={handleNext} className="flex-1" data-testid="onboarding-next">
              {isLast ? "Finish" : "Next"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
