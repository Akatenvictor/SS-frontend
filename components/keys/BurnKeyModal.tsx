"use client";

import { useMemo, useState } from "react";
import { Flame, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { InvestmentPosition } from "@/lib/portfolio";
import { useAuth } from "@/hooks/useAuth";
import { useBurnCreatorKeyMutation } from "@/hooks/useCreatorKeys";
import { useStellarWallet } from "@/hooks/useStellarWallet";

const CONFIRM_PHRASE = "BURN";

interface BurnKeyModalProps {
  position: InvestmentPosition;
  /** When provided the modal is controlled and renders no trigger button of its own. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function BurnKeyModal({
  position,
  open: controlledOpen,
  onOpenChange,
}: BurnKeyModalProps) {
  const { address: authAddress, jwt } = useAuth();
  const { address: walletAddress } = useStellarWallet();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  const [quantity, setQuantity] = useState("1");
  const [confirmText, setConfirmText] = useState("");
  const burnMutation = useBurnCreatorKeyMutation(position.key_id ?? "");

  const heldBalance = position.quantity ?? 0;
  const title = position.key_title ?? position.invoice_title;
  const parsedQuantity = Number(quantity);
  const senderAddress = authAddress ?? walletAddress;

  const overBalance =
    Number.isFinite(parsedQuantity) && parsedQuantity > heldBalance;

  const validationError = useMemo(() => {
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      return "Enter a valid quantity";
    }
    if (overBalance) {
      return "Insufficient balance";
    }
    return null;
  }, [overBalance, parsedQuantity]);

  const isConfirmed = confirmText === CONFIRM_PHRASE;

  const canSubmit =
    Boolean(senderAddress) &&
    isConfirmed &&
    !validationError &&
    !burnMutation.isPending;

  const reset = () => {
    setQuantity("1");
    setConfirmText("");
  };

  const handleSubmit = async () => {
    if (!senderAddress || !canSubmit || validationError) return;

    await burnMutation.mutateAsync({
      quantity: parsedQuantity,
      walletAddress: senderAddress,
      token: jwt,
    });
    setOpen(false);
    reset();
  };

  return (
    <>
      {!isControlled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={heldBalance <= 0}
          onClick={() => setOpen(true)}
          data-testid={`burn-button-${position.key_id}`}
        >
          <Flame className="h-4 w-4" />
          Burn
        </Button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Burn Key
                  </p>
                  <h2 className="text-xl font-semibold">{title}</h2>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setOpen(false);
                    reset();
                  }}
                  aria-label="Close burn modal"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                Burning keys is permanent and cannot be undone.
              </div>

              <div className="space-y-2">
                <label htmlFor="burn-quantity" className="text-sm font-medium">
                  Quantity
                </label>
                <Input
                  id="burn-quantity"
                  type="number"
                  min="1"
                  max={heldBalance}
                  step="1"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  aria-invalid={Boolean(validationError)}
                  data-testid="burn-quantity-input"
                />
                <p className="text-xs text-muted-foreground">
                  Available balance: {heldBalance.toLocaleString()}
                </p>
              </div>

              {validationError && (
                <p
                  className="text-sm font-medium text-destructive"
                  data-testid="burn-quantity-error"
                >
                  {validationError}
                </p>
              )}

              <div className="space-y-2">
                <label htmlFor="burn-confirm" className="text-sm font-medium">
                  Type BURN to confirm
                </label>
                <Input
                  id="burn-confirm"
                  value={confirmText}
                  onChange={(event) => setConfirmText(event.target.value)}
                  placeholder="BURN"
                  data-testid="burn-confirm-input"
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    reset();
                  }}
                  disabled={burnMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  data-testid="burn-confirm-button"
                >
                  {burnMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {burnMutation.isPending ? "Signing..." : "Confirm Burn"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
