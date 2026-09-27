"use client";

import { useMemo, useState } from "react";
import { ArrowRightLeft, CheckCircle2, ExternalLink, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import { useTransferFractionsMutation } from "@/hooks/useInvestments";
import { availableFractions, type InvestmentPosition } from "@/lib/portfolio";
import {
  isValidStellarAddress,
  stellarAddressError,
  transactionExplorerUrl,
} from "@/lib/stellarAddress";

interface FractionTransferModalProps {
  position: InvestmentPosition;
}

/**
 * Sends invoice fractions the investor holds to another Stellar wallet
 * (#421). A gift, not a sale — the counterpart to `PositionTransferModal`,
 * which sells a whole position for a price.
 *
 * Modal shell and validation layout mirror `PositionTransferModal` so the two
 * money-moving dialogs in the portfolio feel like one component to a user.
 */
export function FractionTransferModal({ position }: FractionTransferModalProps) {
  const { address: authAddress, jwt } = useAuth();
  const { address: walletAddress, network } = useStellarWallet();
  const [open, setOpen] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [quantity, setQuantity] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [missingReceipt, setMissingReceipt] = useState(false);
  const transferMutation = useTransferFractionsMutation();

  const senderAddress = authAddress ?? walletAddress;

  // Listed fractions are committed to a live sale, so they are not transferable.
  const available = availableFractions(position);
  const parsedQuantity = Number(quantity);
  const trimmedRecipient = recipient.trim();

  const recipientError = useMemo(
    () => stellarAddressError(trimmedRecipient),
    [trimmedRecipient]
  );

  const quantityError = useMemo(() => {
    if (quantity.trim() === "") return null;
    if (!Number.isFinite(parsedQuantity)) return "Enter a whole number of fractions";
    if (!Number.isInteger(parsedQuantity)) return "Fractions cannot be split — enter a whole number";
    if (parsedQuantity <= 0) return "Enter at least 1 fraction";
    if (parsedQuantity > available) {
      return available === 0
        ? "All your fractions are listed for sale and cannot be transferred"
        : `You can transfer at most ${available} fraction${available === 1 ? "" : "s"}`;
    }
    return null;
  }, [available, parsedQuantity, quantity]);

  const canSubmit =
    Boolean(senderAddress) &&
    isValidStellarAddress(trimmedRecipient) &&
    trimmedRecipient !== senderAddress &&
    quantity.trim() !== "" &&
    Number.isInteger(parsedQuantity) &&
    parsedQuantity > 0 &&
    parsedQuantity <= available &&
    !quantityError &&
    !transferMutation.isPending;

  const reset = () => {
    setRecipient("");
    setQuantity("");
    setTxHash(null);
    setMissingReceipt(false);
  };

  const handleClose = () => {
    setOpen(false);
    reset();
  };

  const handleSubmit = async () => {
    if (!senderAddress || !canSubmit) return;
    setMissingReceipt(false);
    try {
      const result = await transferMutation.mutateAsync({
        invoiceId: position.invoice_id,
        recipient: trimmedRecipient,
        quantity: parsedQuantity,
        walletAddress: senderAddress,
        token: jwt,
      });
      const hash = result?.transaction_hash;
      if (hash) {
        // Stay open on success to show the receipt; the caller closes on Done.
        setTxHash(hash);
        return;
      }
      // Resolved 2xx but with no hash: the transfer cannot be verified, so it
      // is not treated as a confirmed transfer. Staying on the form lets the
      // user retry or check the portfolio balance.
      setMissingReceipt(true);
    } catch {
      // Kept open with the entered values so the user can retry;
      // transferMutation.isError renders the message below.
    }
  };

  // ─── Success state ────────────────────────────────────────────────────────
  if (open && txHash) {
    const remaining = Math.max(0, available - parsedQuantity);
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        data-testid="fraction-transfer-success"
      >
        <Card className="w-full max-w-lg">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Transfer Complete
                </p>
                <h2 className="text-xl font-semibold">{position.invoice_title}</h2>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleClose}
                aria-label="Close transfer modal"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
              Sent {parsedQuantity} fraction{parsedQuantity === 1 ? "" : "s"} to{" "}
              <span className="font-mono break-all">{trimmedRecipient}</span>
            </div>

            <div className="rounded-md border bg-muted/50 p-3 text-sm space-y-1">
              <p className="text-muted-foreground">Transaction hash</p>
              <a
                href={transactionExplorerUrl(txHash, network ?? "testnet")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline break-all"
                data-testid="fraction-transfer-tx-link"
              >
                {txHash}
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>

            <div
              className="rounded-md border bg-muted/50 p-3 text-sm"
              data-testid="fraction-transfer-remaining"
            >
              <p className="text-muted-foreground">Fractions remaining</p>
              <p className="font-semibold">{remaining}</p>
            </div>

            <div className="flex justify-end">
              <Button type="button" onClick={handleClose} data-testid="fraction-transfer-done">
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Entry form ───────────────────────────────────────────────────────────
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={available === 0}
        title={
          available === 0
            ? "All fractions are listed for sale"
            : "Send fractions to another wallet"
        }
        data-testid={`transfer-fractions-button-${position.invoice_id}`}
      >
        <ArrowRightLeft className="h-4 w-4" />
        Transfer
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          data-testid="fraction-transfer-modal"
        >
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Send Fractions
                  </p>
                  <h2 className="text-xl font-semibold">{position.invoice_title}</h2>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  aria-label="Close transfer modal"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-md border bg-muted/50 p-3 text-sm flex items-center justify-between">
                <span className="text-muted-foreground">Available to transfer</span>
                <span className="font-semibold" data-testid="transfer-available-fractions">
                  {available} of {position.quantity ?? 0}
                </span>
              </div>

              {available < (position.quantity ?? 0) && (
                <p className="text-xs text-muted-foreground">
                  {position.listed_quantity} fraction
                  {position.listed_quantity === 1 ? " is" : "s are"} listed for sale and
                  stay put until the listing sells or is cancelled.
                </p>
              )}

              <div className="space-y-2">
                <Label htmlFor={`recipient-${position.invoice_id}`}>
                  Recipient Stellar address
                </Label>
                <Input
                  id={`recipient-${position.invoice_id}`}
                  value={recipient}
                  onChange={(event) => setRecipient(event.target.value)}
                  placeholder="G..."
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={Boolean(recipientError)}
                  data-testid="fraction-transfer-recipient-input"
                />
                {recipientError && (
                  <p
                    className="text-sm font-medium text-destructive"
                    role="alert"
                    data-testid="fraction-transfer-recipient-error"
                  >
                    {recipientError}
                  </p>
                )}
                {trimmedRecipient &&
                  trimmedRecipient === senderAddress &&
                  !recipientError && (
                    <p
                      className="text-sm font-medium text-destructive"
                      role="alert"
                      data-testid="fraction-transfer-self-error"
                    >
                      Cannot send to your own address
                    </p>
                  )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`quantity-${position.invoice_id}`}>Quantity</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setQuantity(String(available))}
                    data-testid="fraction-transfer-max-btn"
                  >
                    Max
                  </Button>
                </div>
                <Input
                  id={`quantity-${position.invoice_id}`}
                  type="number"
                  min="1"
                  max={available}
                  step="1"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  aria-invalid={Boolean(quantityError)}
                  data-testid="fraction-transfer-quantity-input"
                />
                {quantityError && (
                  <p
                    className="text-sm font-medium text-destructive"
                    role="alert"
                    data-testid="fraction-transfer-quantity-error"
                  >
                    {quantityError}
                  </p>
                )}
              </div>

              {transferMutation.isError && (
                <p
                  className="text-sm font-medium text-destructive"
                  role="alert"
                  data-testid="fraction-transfer-submit-error"
                >
                  Transfer failed. Please try again.
                </p>
              )}

              {missingReceipt && (
                <p
                  className="text-sm font-medium text-destructive"
                  role="alert"
                  data-testid="fraction-transfer-no-receipt-error"
                >
                  The transfer was accepted but came back without a transaction
                  hash, so it could not be confirmed. Check your portfolio
                  balance before retrying.
                </p>
              )}

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={transferMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  data-testid="fraction-transfer-confirm"
                >
                  {transferMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {transferMutation.isPending ? "Sending…" : "Send Fractions"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
