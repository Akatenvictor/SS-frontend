"use client";

import Link from "next/link";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import { WalletChip } from "@/components/wallet/WalletChip";
import { UsdcBalanceChip } from "@/components/wallet/UsdcBalanceChip";

export function Navbar() {
  const { address, network, isConnected, isConnecting, connect, disconnect, refreshNetwork } =
    useStellarWallet();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          StellarSettle
        </Link>

        <nav className="flex items-center gap-4">
          <Link href="/marketplace" className="text-sm text-muted-foreground hover:text-foreground">
            Marketplace
          </Link>
          {isConnected ? (
            <div className="flex items-center gap-2">
              <UsdcBalanceChip address={address!} network={network} />
              <WalletChip
                address={address!}
                network={network}
                onDisconnect={disconnect}
                onNetworkChange={refreshNetwork}
              />
            </div>
          ) : (
            <Button onClick={connect} disabled={isConnecting} className="cursor-default">
              <Wallet className="mr-2 h-4 w-4" />
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
