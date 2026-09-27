"use client";

import { useMemo, useState } from "react";
import { Loader2, ArrowRightLeft, X } from "lucide-react";
import { StrKey } from "stellar-sdk";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { InvestmentPosition } from "@/lib/portfolio";
import { useAuth } from "@/hooks/useAuth";
import { useTransferPositionMutation } from "@/hooks/useInvestments";
import { useStellarWallet } from "@/hooks/useStellarWallet";

interface PositionTransferModalProps {
  position: InvestmentPosition;
}

function formatXlm(amount: number): string {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Lets an investor sell their position in a funded invoice to another
 * wallet (issue #119). Mirrors KeyTransferModal's structure — validation
 * pattern, dialog shell — but sells the whole invoice position for a sale
 * price rather than transferring a quantity of creator keys.
 */
export function PositionTransferModal({ position }: PositionTransferModalProps) {
  const { address: authAddress, jwt } = useAuth();
  const { address: walletAddress } = useStellarWallet();
  const [open, setOpen] = useState(false);
  const [buyer, setBuyer] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const transferMutation = useTransferPositionMutation();

  const senderAddress = authAddress ?? walletAddress;
  const parsedSalePrice = Number(salePrice);

  const validationError = useMemo(() => {
    const trimmedBuyer = buyer.trim();

    if (!trimmedBuyer) return null;
    if (!StrKey.isValidEd25519PublicKey(trimmedBuyer)) {
      return "Invalid Stellar address";
    }
    if (senderAddress && trimmedBuyer === senderAddress) {
      return "Cannot transfer to yourself";
    }
    if (salePrice.trim() !== "" && (!Number.isFinite(parsedSalePrice) || parsedSalePrice <= 0)) {
      return "Enter a valid sale price";
    }

    return null;
  }, [buyer, parsedSalePrice, salePrice, senderAddress]);

  const canSubmit =
    Boolean(senderAddress) &&
    buyer.trim().length > 0 &&
    salePrice.trim().length > 0 &&
    Number.isFinite(parsedSalePrice) &&
    parsedSalePrice > 0 &&
    !validationError &&
    !transferMutation.isPending;

  const reset = () => {
    setBuyer("");
    setSalePrice("");
  };

  const handleSubmit = async () => {
    if (!senderAddress || !canSubmit) return;

    try {
      await transferMutation.mutateAsync({
        invoiceId: position.invoice_id,
        buyer: buyer.trim(),
        salePriceXlm: parsedSalePrice,
        walletAddress: senderAddress,
        token: jwt,
      });
      setOpen(false);
      reset();
    } catch {
      // Keep the modal open with the entered values so the user can retry.
      // transferMutation.isError drives the error message below; the toast
      // in useTransferPositionMutation's onError already surfaces this too.
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        data-testid={`transfer-position-button-${position.invoice_id}`}
      >
        <ArrowRightLeft className="h-4 w-4" />
        Transfer Position
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          data-testid="position-transfer-modal"
        >
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Transfer Position
                  </p>
                  <h2 className="text-xl font-semibold">{position.invoice_title}</h2>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setOpen(false);
                    reset();
                  }}
                  aria-label="Close transfer modal"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-md border bg-muted/50 p-3 text-sm">
                <p className="text-muted-foreground">Position being transferred</p>
                <p
                  className="font-semibold"
                  data-testid="transfer-position-amount"
                >
                  {formatXlm(position.committed_amount)} XLM
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor={`buyer-${position.invoice_id}`} className="text-sm font-medium">
                  Buyer wallet address
                </label>
                <Input
                  id={`buyer-${position.invoice_id}`}
                  value={buyer}
                  onChange={(event) => setBuyer(event.target.value)}
                  placeholder="G..."
                  aria-invalid={Boolean(validationError)}
                  data-testid="transfer-position-buyer-input"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor={`price-${position.invoice_id}`} className="text-sm font-medium">
                  Sale price (XLM)
                </label>
                <Input
                  id={`price-${position.invoice_id}`}
                  type="number"
                  min="0"
                  step="0.0000001"
                  value={salePrice}
                  onChange={(event) => setSalePrice(event.target.value)}
                  data-testid="transfer-position-price-input"
                />
              </div>

              {Number.isFinite(parsedSalePrice) && parsedSalePrice > 0 && !validationError && (
                <div className="rounded-md border bg-muted/50 p-3 text-sm">
                  <p className="text-muted-foreground">Expected proceeds</p>
                  <p className="font-semibold" data-testid="transfer-position-proceeds">
                    {formatXlm(parsedSalePrice)} XLM
                  </p>
                </div>
              )}

              {validationError && (
                <p
                  className="text-sm font-medium text-destructive"
                  role="alert"
                  data-testid="transfer-position-error"
                >
                  {validationError}
                </p>
              )}

              {transferMutation.isError && (
                <p
                  className="text-sm font-medium text-destructive"
                  role="alert"
                  data-testid="transfer-position-submit-error"
                >
                  Failed to transfer position. Please try again.
                </p>
              )}

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    reset();
                  }}
                  disabled={transferMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  data-testid="transfer-position-confirm-button"
                >
                  {transferMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {transferMutation.isPending ? "Signing..." : "Confirm Transfer"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
