"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiConflictError } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useKeySupply, useUpdateSupplyCapMutation } from "@/hooks/useCreatorKeys";

interface SupplyCapSettingsProps {
  keyId: string;
}

function formatCount(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function SupplyCapSettings({ keyId }: SupplyCapSettingsProps) {
  const { jwt } = useAuth();
  const supplyQuery = useKeySupply(keyId, jwt);
  const updateMutation = useUpdateSupplyCapMutation(keyId);

  const supply = supplyQuery.data;
  const currentCap = supply?.supplyCap ?? null;

  const [draftCap, setDraftCap] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const capValue = draftCap ?? (currentCap === null ? "" : String(currentCap));
  const circulatingSupply = supply?.circulatingSupply ?? 0;
  const parsedCap = Number(capValue);

  const validationError = useMemo(() => {
    if (capValue.trim() === "") {
      return "Enter a supply cap";
    }
    if (!Number.isFinite(parsedCap) || !Number.isInteger(parsedCap) || parsedCap <= 0) {
      return "Supply cap must be a positive whole number";
    }
    if (parsedCap < circulatingSupply) {
      return `Supply cap cannot be below the circulating supply of ${formatCount(
        circulatingSupply
      )}`;
    }
    return null;
  }, [capValue, circulatingSupply, parsedCap]);

  const isUnchanged = currentCap !== null && parsedCap === currentCap;
  const canSave =
    !validationError && !isUnchanged && !updateMutation.isPending;

  const handleSave = async () => {
    if (!canSave) return;
    setConflictError(null);

    try {
      await updateMutation.mutateAsync({ supplyCap: parsedCap, token: jwt });
      setDraftCap(null);
    } catch (error) {
      if (isApiConflictError(error)) {
        setConflictError(error.message);
        return;
      }
      setConflictError(
        error instanceof Error ? error.message : "Failed to update supply cap"
      );
    }
  };

  if (supplyQuery.isLoading) {
    return (
      <Card data-testid="supply-cap-settings-loading">
        <CardHeader>
          <h2 className="text-lg font-semibold">Supply Cap</h2>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!supply) {
    return null;
  }

  return (
    <Card data-testid="supply-cap-settings">
      <CardHeader>
        <h2 className="text-lg font-semibold">Supply Cap</h2>
        <p className="text-sm text-muted-foreground">
          Set the maximum number of keys that can ever be minted.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Current cap</p>
            <p className="font-semibold" data-testid="supply-cap-current">
              {currentCap === null ? "No cap set" : formatCount(currentCap)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Circulating</p>
            <p className="font-semibold" data-testid="supply-cap-circulating">
              {formatCount(circulatingSupply)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Remaining mintable</p>
            <p className="font-semibold" data-testid="supply-cap-remaining">
              {currentCap === null
                ? "No cap set"
                : formatCount(supply.remainingMintable)}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="supply-cap-input" className="text-sm font-medium">
            New supply cap
          </label>
          <Input
            id="supply-cap-input"
            type="number"
            min="1"
            step="1"
            value={capValue}
            placeholder={currentCap === null ? "No cap set" : undefined}
            onChange={(event) => {
              setDraftCap(event.target.value);
              setConflictError(null);
            }}
            aria-invalid={Boolean(validationError)}
            data-testid="supply-cap-input"
          />
          {validationError && capValue.trim() !== "" && (
            <p
              className="text-sm font-medium text-destructive"
              data-testid="supply-cap-validation-error"
            >
              {validationError}
            </p>
          )}
        </div>

        {conflictError && (
          <p
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
            role="alert"
            data-testid="supply-cap-conflict-error"
          >
            {conflictError}
          </p>
        )}

        <Button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          data-testid="supply-cap-save"
        >
          {updateMutation.isPending && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          Save
        </Button>
      </CardContent>
    </Card>
  );
}
