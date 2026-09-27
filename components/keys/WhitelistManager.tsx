"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Loader2, Trash2, X } from "lucide-react";
import { StrKey } from "stellar-sdk";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import {
  useAddWhitelistAddressMutation,
  useKeyWhitelist,
  useRemoveWhitelistAddressMutation,
  useUpdateWhitelistModeMutation,
} from "@/hooks/useWhitelist";

interface WhitelistManagerProps {
  keyId: string;
  /** Whitelist mode as reported by the key detail endpoint, used until the list loads. */
  whitelistEnabled?: boolean;
}

export function WhitelistManager({
  keyId,
  whitelistEnabled = false,
}: WhitelistManagerProps) {
  const { jwt } = useAuth();
  const [addressInput, setAddressInput] = useState("");
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useKeyWhitelist(keyId, jwt);

  const addMutation = useAddWhitelistAddressMutation(keyId);
  const removeMutation = useRemoveWhitelistAddressMutation(keyId);
  const modeMutation = useUpdateWhitelistModeMutation(keyId);

  const entries = useMemo(
    () => data?.pages.flatMap((page) => page.entries) ?? [],
    [data]
  );

  const modeEnabled = data?.pages[0]?.whitelist_enabled ?? whitelistEnabled;

  const trimmedAddress = addressInput.trim();
  const validationError =
    trimmedAddress.length > 0 && !StrKey.isValidEd25519PublicKey(trimmedAddress)
      ? "Invalid Stellar address"
      : null;

  const canAdd =
    trimmedAddress.length > 0 && !validationError && !addMutation.isPending;

  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleIntersect = useCallback(
    (observerEntries: IntersectionObserverEntry[]) => {
      if (observerEntries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  const observer = useMemo(() => {
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
      return null;
    }
    return new IntersectionObserver(handleIntersect, { rootMargin: "200px" });
  }, [handleIntersect]);

  const sentinelRefCallback = useCallback(
    (node: HTMLDivElement | null) => {
      if (observer) {
        if (sentinelRef.current) observer.unobserve(sentinelRef.current);
        if (node) observer.observe(node);
      }
      sentinelRef.current = node;
    },
    [observer]
  );

  const handleAdd = async () => {
    if (!canAdd) return;
    await addMutation.mutateAsync({ address: trimmedAddress, token: jwt });
    setAddressInput("");
  };

  const handleConfirmRemove = async () => {
    if (!pendingRemoval) return;
    await removeMutation.mutateAsync({ address: pendingRemoval, token: jwt });
    setPendingRemoval(null);
  };

  return (
    <div className="space-y-4" data-testid="whitelist-manager">
      <Card>
        <CardContent className="flex items-center justify-between gap-4 pt-6">
          <div>
            <p className="text-sm font-medium">Whitelist mode</p>
            <p className="text-sm text-muted-foreground" data-testid="whitelist-mode-state">
              {modeEnabled
                ? "Only approved wallets can buy this key"
                : "Anyone can buy this key"}
            </p>
          </div>
          <Switch
            checked={modeEnabled}
            disabled={modeMutation.isPending}
            onCheckedChange={(checked) =>
              modeMutation.mutate({ enabled: checked, token: jwt })
            }
            aria-label="Toggle whitelist mode"
            data-testid="whitelist-mode-toggle"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold">Add approved wallet</h3>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={addressInput}
              onChange={(event) => setAddressInput(event.target.value)}
              placeholder="G..."
              aria-label="Wallet address"
              aria-invalid={Boolean(validationError)}
              data-testid="whitelist-address-input"
            />
            <Button
              type="button"
              onClick={handleAdd}
              disabled={!canAdd}
              data-testid="whitelist-add-button"
            >
              {addMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Add
            </Button>
          </div>
          {validationError && (
            <p
              className="text-sm font-medium text-destructive"
              data-testid="whitelist-address-error"
            >
              {validationError}
            </p>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-2" data-testid="whitelist-loading">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent
            className="py-10 text-center text-sm text-muted-foreground"
            data-testid="whitelist-empty"
          >
            No approved addresses yet.
          </CardContent>
        </Card>
      ) : (
        <ul className="divide-y rounded-md border" data-testid="whitelist-entries">
          {entries.map((entry) => (
            <li
              key={entry.address}
              className="flex items-center justify-between gap-4 px-4 py-3"
              data-testid={`whitelist-row-${entry.address}`}
            >
              <span className="truncate font-mono text-sm">{entry.address}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPendingRemoval(entry.address)}
                aria-label={`Remove ${entry.address}`}
                data-testid={`whitelist-remove-${entry.address}`}
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div ref={sentinelRefCallback} data-testid="whitelist-sentinel" />

      {isFetchingNextPage && <Skeleton className="h-12 w-full" />}

      {pendingRemoval && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          data-testid="whitelist-remove-dialog"
        >
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-lg font-semibold">Remove address?</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setPendingRemoval(null)}
                  aria-label="Close remove confirmation"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-muted-foreground">
                <span className="font-mono break-all">{pendingRemoval}</span> will no
                longer be able to buy this key while whitelist mode is on.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPendingRemoval(null)}
                  disabled={removeMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleConfirmRemove}
                  disabled={removeMutation.isPending}
                  data-testid="whitelist-remove-confirm"
                >
                  {removeMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Remove
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
