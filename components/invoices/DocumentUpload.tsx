"use client";

import { useCallback, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPE = "application/pdf";

type UploadError = "invalid_type" | "too_large" | "empty" | null;

const ERROR_MESSAGES: Record<NonNullable<UploadError>, string> = {
  invalid_type: "Only PDF files are accepted",
  too_large: "File must be under 10 MB",
  empty: "File cannot be empty",
};

interface DocumentUploadProps {
  onUpload: (file: File) => void;
}

export function DocumentUpload({ onUpload }: DocumentUploadProps) {
  const [error, setError] = useState<UploadError>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = useCallback((file: File | null): UploadError => {
    if (!file || file.size === 0) return "empty";
    if (file.type !== ACCEPTED_TYPE) return "invalid_type";
    if (file.size > MAX_FILE_SIZE) return "too_large";
    return null;
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null;
      const validationError = validate(file);

      if (validationError) {
        setError(validationError);
        return;
      }

      setError(null);
      onUpload(file as File);
    },
    [validate, onUpload],
  );

  return (
    <div className="space-y-2">
      <Label htmlFor="document-upload">Upload Document</Label>
      <Input
        ref={inputRef}
        id="document-upload"
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleChange}
      />
      {error && (
        <p className="text-sm text-destructive">{ERROR_MESSAGES[error]}</p>
      )}
    </div>
  );
}
