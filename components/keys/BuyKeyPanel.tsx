"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CreatorKeyDetail, KeySupply } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import {
  useBuyCreatorKeyMutation,
  useKeyWhitelistStatus,
} from "@/hooks/useCreatorKeys";
import { SupplyCapSection } from "@/components/keys/SupplyCapSection";

interface BuyKeyPanelProps {
  creatorKey: CreatorKeyDetail;
  supply?: KeySupply | null;
}

export function BuyKeyPanel({ creatorKey, supply }: BuyKeyPanelProps) {
  const { address, jwt, loginWithWallet, isConnecting } = useAuth();
  const whitelistQuery = useKeyWhitelistStatus(creatorKey.id, address, jwt);
  const buyMutation = useBuyCreatorKeyMutation(creatorKey.id);

  const whitelistEnabled =
    whitelistQuery.data?.whitelist_enabled ?? creatorKey.whitelist_enabled;
  const isApproved = whitelistQuery.data?.is_approved ?? false;
  const inviteOnlyBlocked = Boolean(
    address && whitelistEnabled && !isApproved
  );
  const isWhitelistLoading = Boolean(address && whitelistQuery.isLoading);
  const isSoldOut = Boolean(
    supply?.supplyCap !== null && supply?.remainingMintable === 0
  );

  const handleBuy = async () => {
    if (!address) {
      await loginWithWallet();
      return;
    }

    await buyMutation.mutateAsync({ walletAddress: address, token: jwt });
  };

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Buy Key</h2>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Current price</p>
          <p className="text-2xl font-bold">
            {creatorKey.price.toLocaleString()} XLM
          </p>
        </div>

        {isWhitelistLoading ? (
          <Skeleton className="h-9 w-full" data-testid="buy-button-skeleton" />
        ) : (
          <div className="space-y-2">
            {supply && <SupplyCapSection supply={supply} />}

            <span
              title={
                isSoldOut
                  ? "This key has reached its supply cap"
                  : inviteOnlyBlocked
                    ? "Your wallet is not on the whitelist for this key"
                    : undefined
              }
              className="block"
            >
              <Button
                type="button"
                className="w-full"
                onClick={handleBuy}
                disabled={
                  isSoldOut ||
                  inviteOnlyBlocked ||
                  buyMutation.isPending ||
                  isConnecting
                }
                data-testid="buy-key-button"
              >
                {(buyMutation.isPending || isConnecting) && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {isSoldOut ? "Sold Out" : address ? "Buy Key" : "Connect Wallet"}
              </Button>
            </span>

            {inviteOnlyBlocked && (
              <p className="text-sm text-muted-foreground">
                This key is invite-only
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
