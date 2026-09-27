"use client";

import { Badge } from "@/components/ui/badge";
import type { KeySupply } from "@/lib/api";

interface SupplyCapSectionProps {
  supply: KeySupply;
}

function formatCount(value: number): string {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

export function SupplyCapSection({ supply }: SupplyCapSectionProps) {
  if (supply.supplyCap === null) {
    return null;
  }

  const percentage =
    supply.supplyCap > 0
      ? Math.min((supply.circulatingSupply / supply.supplyCap) * 100, 100)
      : 0;
  const isSoldOut = supply.remainingMintable <= 0;

  return (
    <section className="space-y-3" data-testid="supply-section">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Supply</h3>
        {isSoldOut && (
          <Badge variant="destructive" data-testid="sold-out-badge">
            Sold Out
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
          <div
            data-testid="supply-progress-bar"
            role="progressbar"
            aria-label="Supply sold"
            aria-valuenow={Math.round(percentage)}
            aria-valuemin={0}
            aria-valuemax={100}
            className={isSoldOut ? "h-full bg-destructive" : "h-full bg-primary"}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">Circulating</p>
            <p className="font-semibold">
              {formatCount(supply.circulatingSupply)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Cap</p>
            <p className="font-semibold">{formatCount(supply.supplyCap)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Remaining</p>
            <p className="font-semibold" data-testid="remaining-mintable">
              {formatCount(supply.remainingMintable)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
