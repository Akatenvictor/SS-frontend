"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  MIN_INVOICE_FACE_VALUE,
  validateFaceValue,
} from "@/lib/validation/face-value";

interface FaceValueInputProps {
  min?: number;
  id?: string;
  defaultValue?: string;
  onValidAmountChange?: (amount: number | null) => void;
}

export function FaceValueInput({
  min = MIN_INVOICE_FACE_VALUE,
  id = "invoice-face-value",
  defaultValue = "",
  onValidAmountChange,
}: FaceValueInputProps) {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(() => {
    if (!defaultValue.trim()) return null;
    return validateFaceValue(defaultValue, min);
  });

  function handleChange(rawValue: string) {
    setValue(rawValue);

    if (rawValue.trim() === "") {
      setError(null);
      onValidAmountChange?.(null);
      return;
    }

    const validationError = validateFaceValue(rawValue, min);
    setError(validationError);
    onValidAmountChange?.(validationError ? null : Number(rawValue));
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Face Value (XLM)</Label>
      <Input
        id={id}
        inputMode="decimal"
        placeholder={`Min ${min}`}
        value={value}
        aria-invalid={error !== null}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(error && "border-destructive focus-visible:ring-destructive")}
        onChange={(e) => handleChange(e.target.value)}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
