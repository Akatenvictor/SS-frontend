"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useInvestMutation } from "@/hooks/useInvestments";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import { PriceImpactWarning } from "@/components/invoices/PriceImpactWarning";
import { Loader2, ExternalLink } from "lucide-react";

interface FractionInvestmentModalProps {
  /** Invoice ID to invest in */
  invoiceId: string;
  /** Human-readable invoice title */
  invoiceTitle: string;
  /** XLM value of one fraction */
  fractionPrice: number;
  /** Minimum number of fractions an investor must purchase */
  minFractions: number;
  /** Maximum fractions available for purchase */
  availableFractions: number;
  /** Wallet balance in XLM */
  walletBalance?: number;
  /** Total funding cap for price-impact calculation (issue #344) */
  fundingCap?: number;
  /** Called when investment succeeds */
  onSuccess?: (txHash: string) => void;
}

// Stellar Explorer base URL
const EXPLORER_BASE = "https://stellar.expert/explorer/testnet/tx";

// ─── Success state ─────────────────────────────────────────────────────────

interface SuccessViewProps {
  txHash: string;
  quantity: number;
  totalCost: number;
  onClose: () => void;
}

function SuccessView({ txHash, quantity, totalCost, onClose }: SuccessViewProps) {
  return (
    <div className="space-y-4 text-center py-2">
      <div className="text-2xl" aria-hidden>
        ✅
      </div>
      <div>
        <p className="font-semibold">Investment Confirmed!</p>
        <p className="text-sm text-muted-foreground">
          {quantity} fraction{quantity !== 1 ? "s" : ""} ·{" "}
          {totalCost.toLocaleString()} XLM
        </p>
      </div>
      <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs font-mono break-all text-left">
        {txHash}
      </div>
      <div className="flex flex-col gap-2">
        <Button variant="outline" size="sm" asChild>
          <a
            href={`${EXPLORER_BASE}/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View on Stellar Explorer"
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            View on Explorer
          </a>
        </Button>
        <Button size="sm" asChild>
          <Link href="/investor">View Portfolio</Link>
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

export function FractionInvestmentModal({
  invoiceId,
  invoiceTitle,
  fractionPrice,
  minFractions,
  availableFractions,
  walletBalance,
  fundingCap,
  onSuccess,
}: FractionInvestmentModalProps) {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState<string>(String(minFractions));
  const [successTx, setSuccessTx] = useState<string | null>(null);
  const [successQty, setSuccessQty] = useState(0);

  const { address } = useStellarWallet();
  const investMutation = useInvestMutation();

  // ── Derived values ───────────────────────────────────────────────────────

  const parsedQty = useMemo(() => {
    const n = parseInt(quantity, 10);
    return isNaN(n) ? 0 : n;
  }, [quantity]);

  const totalCost = useMemo(
    () => parsedQty * fractionPrice,
    [parsedQty, fractionPrice]
  );

  const hasInsufficientBalance = useMemo(() => {
    if (walletBalance === undefined) return false;
    return totalCost > walletBalance;
  }, [totalCost, walletBalance]);

  const qtyError = useMemo(() => {
    if (!quantity || parsedQty === 0) return null;
    if (parsedQty < minFractions)
      return `Minimum is ${minFractions} fraction${minFractions !== 1 ? "s" : ""}`;
    if (parsedQty > availableFractions)
      return `Only ${availableFractions} fraction${availableFractions !== 1 ? "s" : ""} available`;
    return null;
  }, [parsedQty, minFractions, availableFractions, quantity]);

  const canInvest =
    parsedQty > 0 &&
    qtyError === null &&
    !hasInsufficientBalance &&
    !investMutation.isPending;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleQuantityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Allow only positive integers
      const raw = e.target.value.replace(/[^0-9]/g, "");
      setQuantity(raw);
    },
    []
  );

  const handleConfirm = useCallback(async () => {
    if (!canInvest) return;

    try {
      await investMutation.mutateAsync({
        invoiceId,
        amount: totalCost,
      });

      // The mutation's onSuccess fires a toast — here we additionally show
      // the success state inside the modal.
      const mockTxHash = `tx_${Date.now()}_${invoiceId.slice(0, 8)}`;
      setSuccessQty(parsedQty);
      setSuccessTx(mockTxHash);
      onSuccess?.(mockTxHash);
    } catch {
      // Error toast is handled by the mutation's onError callback
    }
  }, [canInvest, investMutation, invoiceId, totalCost, parsedQty, onSuccess]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next) {
        // Reset local state when closing
        setSuccessTx(null);
        setQuantity(String(minFractions));
      }
    },
    [minFractions]
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button data-testid="fraction-invest-button">Invest</Button>
      </PopoverTrigger>
      <PopoverContent className="w-full max-w-sm p-0" align="start">
        <Card className="border-0">
          <CardHeader>
            <CardTitle>Invest in Invoice</CardTitle>
            <CardDescription className="truncate">{invoiceTitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {successTx ? (
              <SuccessView
                txHash={successTx}
                quantity={successQty}
                totalCost={successQty * fractionPrice}
                onClose={() => handleOpenChange(false)}
              />
            ) : (
              <>
                {/* ── Summary row ── */}
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price per fraction</span>
                    <span className="font-medium">
                      {fractionPrice.toLocaleString()} XLM
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Available fractions</span>
                    <span className="font-medium">
                      {availableFractions.toLocaleString()}
                    </span>
                  </div>
                  {walletBalance !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Wallet balance</span>
                      <span className="font-medium">
                        {walletBalance.toLocaleString()} XLM
                      </span>
                    </div>
                  )}
                </div>

                <Separator />

                {/* ── Quantity input ── */}
                <div className="space-y-2">
                  <Label htmlFor="fraction-qty">
                    Quantity (min {minFractions})
                  </Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 p-0 shrink-0"
                      aria-label="Decrease quantity"
                      onClick={() =>
                        setQuantity((prev) =>
                          String(Math.max(minFractions, (parseInt(prev, 10) || 0) - 1))
                        )
                      }
                    >
                      −
                    </Button>
                    <Input
                      id="fraction-qty"
                      inputMode="numeric"
                      value={quantity}
                      onChange={handleQuantityChange}
                      className="text-center"
                      aria-label="Fraction quantity"
                      aria-describedby={qtyError ? "fraction-qty-error" : undefined}
                      aria-invalid={qtyError !== null}
                      data-testid="fraction-quantity-input"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 p-0 shrink-0"
                      aria-label="Increase quantity"
                      onClick={() =>
                        setQuantity((prev) =>
                          String(
                            Math.min(
                              availableFractions,
                              (parseInt(prev, 10) || 0) + 1
                            )
                          )
                        )
                      }
                    >
                      +
                    </Button>
                  </div>
                  {qtyError && (
                    <p
                      id="fraction-qty-error"
                      role="alert"
                      className="text-sm text-destructive"
                    >
                      {qtyError}
                    </p>
                  )}
                </div>

                {/* ── Total cost ── */}
                <div className="rounded-md bg-muted/50 px-4 py-3 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total cost</span>
                  <span
                    className="text-lg font-bold tabular-nums"
                    data-testid="fraction-total-cost"
                  >
                    {totalCost.toLocaleString()} XLM
                  </span>
                </div>

                <PriceImpactWarning
                  amount={totalCost > 0 ? totalCost : null}
                  fundingCap={fundingCap ?? availableFractions * fractionPrice}
                />

                {/* ── Insufficient balance banner ── */}
                {hasInsufficientBalance && (
                  <div
                    role="alert"
                    className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-300 flex items-start justify-between gap-3"
                  >
                    <span>Insufficient balance for this investment.</span>
                    <Button
                      asChild
                      variant="link"
                      size="sm"
                      className="p-0 h-auto text-amber-800 dark:text-amber-300 underline shrink-0"
                    >
                      <Link href="/wallet/top-up">Top up</Link>
                    </Button>
                  </div>
                )}

                {/* ── Wallet not connected ── */}
                {!address && (
                  <p className="text-sm text-muted-foreground text-center">
                    Connect your wallet to invest.
                  </p>
                )}

                {/* ── Actions ── */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleOpenChange(false)}
                    disabled={investMutation.isPending}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    disabled={!canInvest || !address}
                    className="flex-1"
                    data-testid="fraction-confirm-button"
                  >
                    {investMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Confirming…
                      </>
                    ) : (
                      "Confirm Investment"
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
