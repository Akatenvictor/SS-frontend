"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBuyFractionMutation } from "@/hooks/useSecondaryMarket";
import { listingImpliedYield, totalCost } from "@/lib/secondaryMarket";
import type { ResaleListing } from "@/lib/api";

interface BuyFractionModalProps {
  listing: ResaleListing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPurchased?: (listing: ResaleListing) => void;
}

/**
 * Buy-fraction modal (issue #380). The total is derived from the quantity the
 * user types, and the quantity is capped at what the listing still has, so a
 * purchase can never be submitted for more fractions than exist.
 */
export function BuyFractionModal({
  listing,
  open,
  onOpenChange,
  onPurchased,
}: BuyFractionModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const buyMutation = useBuyFractionMutation();

  // Reset whenever a different listing is opened.
  useEffect(() => {
    setQuantity(1);
    setError(null);
  }, [listing?.id, open]);

  if (!listing) return null;

  const maxQuantity = Math.max(0, listing.remaining_quantity);
  const cost = totalCost(listing.ask_price, quantity);
  const isValid = quantity >= 1 && quantity <= maxQuantity;

  async function handleConfirm() {
    if (!listing || !isValid) return;
    setError(null);
    try {
      await buyMutation.mutateAsync({ listingId: listing.id, quantity });
      onPurchased?.(listing);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purchase failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="buy-fraction-modal" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Buy fractions</DialogTitle>
          <DialogDescription>
            {listing.invoice_title} — {formatPrice(listing.ask_price)} XLM per fraction
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="buy-quantity">Quantity</Label>
            <Input
              id="buy-quantity"
              type="number"
              min={1}
              max={maxQuantity}
              step={1}
              value={quantity}
              onChange={(event) => {
                const next = Number(event.target.value);
                setQuantity(Number.isFinite(next) ? next : 0);
                setError(null);
              }}
              data-testid="buy-quantity-input"
            />
            <p className="text-xs text-muted-foreground" data-testid="buy-quantity-available">
              {maxQuantity} {maxQuantity === 1 ? "fraction" : "fractions"} available
            </p>
          </div>

          <dl className="space-y-1 rounded-lg border p-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Price per fraction</dt>
              <dd>{formatPrice(listing.ask_price)} XLM</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Implied yield</dt>
              <dd data-testid="buy-modal-implied-yield">
                {listingImpliedYield(listing).toFixed(2)}%
              </dd>
            </div>
            <div className="flex justify-between border-t pt-1 font-medium">
              <dt>Total cost</dt>
              <dd data-testid="buy-modal-total-cost">{formatPrice(cost)} XLM</dd>
            </div>
          </dl>

          {quantity > maxQuantity && (
            <p className="text-sm text-destructive" data-testid="buy-quantity-error">
              Only {maxQuantity} {maxQuantity === 1 ? "fraction is" : "fractions are"}{" "}
              available.
            </p>
          )}
          {error && (
            <p className="text-sm text-destructive" data-testid="buy-fraction-error">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="buy-cancel-btn">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid || buyMutation.isPending}
            data-testid="buy-confirm-btn"
          >
            {buyMutation.isPending ? "Submitting…" : "Confirm purchase"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatPrice(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}
