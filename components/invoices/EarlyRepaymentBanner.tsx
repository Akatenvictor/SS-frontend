"use client";

import { useState } from "react";
import { AlertCircle, Check, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface EarlyRepaymentBannerProps {
  amount: number;
  originalMaturityDate: string;
  newSettlementDate: string;
}

/**
 * Session-storage key so dismissal persists for the duration of the browser
 * session (cleared when the tab/window is closed).
 */
function storageKey(amount: number): string {
  return `early-repayment-acknowledged-${amount}`;
}

function isAcknowledged(amount: number): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(storageKey(amount)) === "true";
}

function setAcknowledged(amount: number): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(storageKey(amount), "true");
}

export function EarlyRepaymentBanner({
  amount,
  originalMaturityDate,
  newSettlementDate,
}: EarlyRepaymentBannerProps) {
  const [acknowledged, setAcknowledgedState] = useState(() =>
    isAcknowledged(amount),
  );

  if (acknowledged) return null;

  const handleAcknowledge = () => {
    setAcknowledged(amount);
    setAcknowledgedState(true);
  };

  return (
    <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800">
      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertDescription className="flex-1">
        <div className="font-medium text-amber-900 dark:text-amber-100 mb-1">
          Early Repayment Notice
        </div>
        <div className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
          <div>
            <span className="font-medium">Repayment Amount:</span>{" "}
            {amount.toLocaleString()} XLM
          </div>
          <div>
            <span className="font-medium">Original Maturity:</span>{" "}
            {new Date(originalMaturityDate).toLocaleDateString()}
          </div>
          <div>
            <span className="font-medium">New Settlement Date:</span>{" "}
            {new Date(newSettlementDate).toLocaleDateString()}
          </div>
        </div>
      </AlertDescription>
      <div className="flex items-center gap-1 ml-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-auto px-2 py-1 text-xs text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
          onClick={handleAcknowledge}
        >
          <Check className="h-4 w-4 mr-1" />
          Acknowledge
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={handleAcknowledge}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
}
