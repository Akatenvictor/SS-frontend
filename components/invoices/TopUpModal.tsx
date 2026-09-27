"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTopUpMutation } from "@/hooks/useInvestments";
import { cn } from "@/lib/utils";

interface TopUpModalProps {
  invoiceId: string;
  currentCommittedAmount: number;
  remainingCapacity: number;
  onSuccess?: () => void;
}

export function TopUpModal({
  invoiceId,
  currentCommittedAmount,
  remainingCapacity,
  onSuccess,
}: TopUpModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [additionalAmount, setAdditionalAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const topUpMutation = useTopUpMutation();

  const validateAmount = (value: string): string | null => {
    if (value.trim() === "") {
      return null;
    }

    const amount = Number(value);

    if (Number.isNaN(amount) || amount <= 0) {
      return "Please enter a valid positive amount";
    }

    if (amount > remainingCapacity) {
      return "Exceeds remaining capacity";
    }

    return null;
  };

  const handleAmountChange = (value: string) => {
    setAdditionalAmount(value);
    setError(validateAmount(value));
  };

  const handleTopUp = async () => {
    const validationError = validateAmount(additionalAmount);
    if (validationError) {
      setError(validationError);
      return;
    }

    const amount = Number(additionalAmount);
    await topUpMutation.mutateAsync({ invoiceId, amount });
    setIsOpen(false);
    setAdditionalAmount("");
    setError(null);
    onSuccess?.();
  };

  const newTotal = currentCommittedAmount + Number(additionalAmount || 0);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          data-testid="top-up-button"
        >
          Top Up
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Top Up Investment</h3>
            <p className="text-sm text-muted-foreground">
              Increase your position in this invoice
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Current committed amount</Label>
            <p className="text-sm font-medium">
              {currentCommittedAmount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} XLM
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="top-up-amount">Additional amount (XLM)</Label>
            <Input
              id="top-up-amount"
              inputMode="decimal"
              placeholder={`0 - ${remainingCapacity.toLocaleString()}`}
              value={additionalAmount}
              aria-invalid={error !== null}
              aria-describedby={error ? "top-up-amount-error" : undefined}
              className={cn(error && "border-destructive focus-visible:ring-destructive")}
              onChange={(e) => handleAmountChange(e.target.value)}
            />
            {error && (
              <p id="top-up-amount-error" role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>

          {additionalAmount && !error && (
            <div className="space-y-1.5">
              <Label>New total position</Label>
              <p className="text-sm font-medium">
                {newTotal.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} XLM
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleTopUp}
              disabled={!!error || !additionalAmount || topUpMutation.isPending}
              className="flex-1"
            >
              {topUpMutation.isPending ? "Processing..." : "Confirm Top Up"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
