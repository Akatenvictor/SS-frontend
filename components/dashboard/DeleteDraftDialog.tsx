"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface DeleteDraftDialogProps {
  /** Title of the draft awaiting confirmation. */
  invoiceTitle: string;
  open: boolean;
  isDeleting?: boolean;
  errorMessage?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation step before a draft is deleted.
 *
 * Deletion is irreversible, so the destructive action is never the default:
 * Cancel takes focus on open, and Escape or a backdrop click dismisses.
 */
export function DeleteDraftDialog({
  invoiceTitle,
  open,
  isDeleting = false,
  errorMessage,
  onConfirm,
  onCancel,
}: DeleteDraftDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isDeleting) onCancel();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, isDeleting, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => !isDeleting && onCancel()}
      data-testid="delete-draft-backdrop"
    >
      <Card
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-draft-title"
        aria-describedby="delete-draft-description"
        className="w-full max-w-md"
        onClick={(event) => event.stopPropagation()}
      >
        <CardHeader>
          <h2 id="delete-draft-title" className="text-lg font-semibold">
            Delete this draft?
          </h2>
        </CardHeader>

        <CardContent className="space-y-4">
          <p id="delete-draft-description" className="text-sm text-muted-foreground">
            &ldquo;{invoiceTitle}&rdquo; will be permanently deleted. This cannot be
            undone.
          </p>

          {errorMessage && (
            <p className="text-sm text-red-600" role="alert">
              {errorMessage}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              ref={cancelRef}
              variant="outline"
              onClick={onCancel}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirm}
              disabled={isDeleting}
              data-testid="confirm-delete-draft"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete draft
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
