"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import {
  useDistributeDividendMutation,
  useKeySupply,
} from "@/hooks/useCreatorKeys";
import { useStellarWallet } from "@/hooks/useStellarWallet";

interface DistributeDividendsPanelProps {
  keyId: string;
  holdersCount: number;
}

function formatXlm(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 7,
  });
}

export function DistributeDividendsPanel({
  keyId,
  holdersCount,
}: DistributeDividendsPanelProps) {
  const { address: authAddress, jwt } = useAuth();
  const { address: walletAddress } = useStellarWallet();
  const { data: supply } = useKeySupply(keyId, jwt);
  const distributeMutation = useDistributeDividendMutation(keyId);

  const [amount, setAmount] = useState("");

  const senderAddress = authAddress ?? walletAddress;
  const circulatingSupply = supply?.circulatingSupply ?? 0;
  const parsedAmount = Number(amount);
  const hasValidAmount =
    amount.trim() !== "" && Number.isFinite(parsedAmount) && parsedAmount > 0;

  const perKeyAmount = useMemo(() => {
    if (!hasValidAmount || circulatingSupply <= 0) return 0;
    return parsedAmount / circulatingSupply;
  }, [circulatingSupply, hasValidAmount, parsedAmount]);

  const canSubmit =
    hasValidAmount &&
    circulatingSupply > 0 &&
    Boolean(senderAddress) &&
    !distributeMutation.isPending;

  const handleSubmit = async () => {
    if (!canSubmit || !senderAddress) return;

    const result = await distributeMutation.mutateAsync({
      amount: parsedAmount,
      walletAddress: senderAddress,
      token: jwt,
    });

    toast.success(
      `Distributed ${formatXlm(result.totalDistributed)} XLM — ${formatXlm(
        result.perKeyAmount
      )} XLM per key`
    );
    setAmount("");
  };

  return (
    <Card data-testid="distribute-dividends-panel">
      <CardHeader>
        <h2 className="text-lg font-semibold">Distribute Dividends</h2>
        <p className="text-sm text-muted-foreground">
          Send XLM to every holder, split evenly across all circulating keys.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="dividend-amount" className="text-sm font-medium">
            Amount (XLM)
          </label>
          <Input
            id="dividend-amount"
            type="number"
            min="0"
            step="0.0000001"
            value={amount}
            placeholder="0.00"
            onChange={(event) => setAmount(event.target.value)}
            data-testid="dividend-amount-input"
          />
        </div>

        <div className="rounded-md bg-muted px-3 py-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Per key</span>
            <span className="font-semibold" data-testid="dividend-per-key">
              {formatXlm(perKeyAmount)} XLM
            </span>
          </div>
          <p
            className="mt-1 text-xs text-muted-foreground"
            data-testid="dividend-holder-count"
          >
            {holdersCount.toLocaleString()} holders ·{" "}
            {circulatingSupply.toLocaleString()} keys circulating
          </p>
        </div>

        {circulatingSupply <= 0 && (
          <p className="text-sm text-muted-foreground" data-testid="dividend-no-supply">
            No keys are circulating yet, so there is nothing to distribute.
          </p>
        )}

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          data-testid="dividend-submit"
        >
          {distributeMutation.isPending && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          {distributeMutation.isPending ? "Signing..." : "Distribute"}
        </Button>
      </CardContent>
    </Card>
  );
}
