"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { validateInvestmentAmount } from "@/lib/validation/investment-amount";

interface InvestmentAmountInputProps {
    min: number;
    max: number;
    onValidAmountChange?: (amount: number | null) => void;
}

export function InvestmentAmountInput({ min, max, onValidAmountChange }: InvestmentAmountInputProps) {
    const [value, setValue] = useState("");
    const [error, setError] = useState<string | null>(null);

    function handleChange(rawValue: string) {
        setValue(rawValue);

        if (rawValue.trim() === "") {
            setError(null);
            onValidAmountChange?.(null);
            return;
        }

        const validationError = validateInvestmentAmount(rawValue, min, max);
        setError(validationError);
        onValidAmountChange?.(validationError ? null : Number(rawValue));
    }

    return (
        <div className="space-y-1.5">
            <Label htmlFor="investment-amount">Investment amount (XLM)</Label>
            <Input
                id="investment-amount"
                inputMode="decimal"
                placeholder={`${min} - ${max}`}
                value={value}
                aria-invalid={error !== null}
                aria-describedby={error ? "investment-amount-error" : undefined}
                className={cn(error && "border-destructive focus-visible:ring-destructive")}
                onChange={(e) => handleChange(e.target.value)}
            />
            {error && (
                <p id="investment-amount-error" role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            )}
        </div>
    );
}
