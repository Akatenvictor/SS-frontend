"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type ChecklistKycStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "requires_resubmission"
  | "not_submitted"
  | null;

export interface OnboardingChecklistProps {
  walletConnected: boolean;
  kycStatus: ChecklistKycStatus;
  invoiceCount: number;
}

const STORAGE_KEY = "onboarding_checklist_dismissed";

/**
 * Seller onboarding checklist (#316).
 *
 * Guides new sellers through the three steps required to submit their first
 * invoice: connect wallet, complete KYC, and submit the first invoice. Each
 * step links to its action page, a progress percentage is shown at the top,
 * and the checklist disappears automatically once every step is complete.
 */
export function OnboardingChecklist({
  walletConnected,
  kycStatus,
  invoiceCount,
}: OnboardingChecklistProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (dismissed === "true") {
        setIsDismissed(true);
      }
    }
  }, []);

  const steps = [
    {
      key: "connect-wallet",
      label: "Connect your wallet",
      href: "/connect-wallet",
      complete: walletConnected,
    },
    {
      key: "kyc",
      label: "Complete Identity Verification (KYC)",
      href: "/kyc/status",
      complete: kycStatus === "approved",
    },
    {
      key: "first-invoice",
      label: "Submit your first invoice",
      href: "/seller/publish",
      complete: invoiceCount >= 1,
    },
  ];

  const completedCount = steps.filter((step) => step.complete).length;
  const progressPercentage = Math.round((completedCount / steps.length) * 100);
  const allComplete = completedCount === steps.length;

  if (isDismissed || allComplete) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "true");
    }
  };

  return (
    <Card className="relative mb-6" data-testid="onboarding-checklist">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-bold">Getting Started Checklist</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={handleDismiss}
          aria-label="Dismiss checklist"
          data-testid="dismiss-checklist-btn"
        >
          <X className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          className="flex items-center gap-2 text-sm text-muted-foreground"
          data-testid="checklist-progress"
        >
          <span>{progressPercentage}% complete</span>
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progressPercentage}%` }}
              role="progressbar"
              aria-valuenow={progressPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Onboarding progress"
            />
          </div>
        </div>

        {steps.map((step, index) => (
          <div key={step.key} className="flex items-center gap-3 text-sm">
            {step.complete ? (
              <CheckCircle2
                className="size-5 text-green-500 shrink-0"
                data-testid={`step-${index + 1}-complete`}
              />
            ) : (
              <Circle
                className="size-5 text-muted-foreground shrink-0"
                data-testid={`step-${index + 1}-incomplete`}
              />
            )}
            {step.complete ? (
              <span className="line-through text-muted-foreground">{step.label}</span>
            ) : (
              <Link
                href={step.href}
                className="font-medium underline-offset-4 hover:underline"
                data-testid={`step-${index + 1}-link`}
              >
                {step.label}
              </Link>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
