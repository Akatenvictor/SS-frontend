"use client";

import { useState } from "react";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import { ConnectWalletModal, UsdcBalanceChip, WalletChip } from "@/components/wallet";
import { NotificationCenter } from "@/components/layout/NotificationCenter";
import { CurrencyToggle } from "@/components/layout/CurrencyToggle";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export function Navbar() {
  const { address, network, isConnected, isConnecting, disconnect, refreshNetwork } =
    useStellarWallet();
  // #379 — the connect button opens a modal listing every supported wallet
  // rather than silently assuming Freighter.
  const [connectOpen, setConnectOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          StellarSettle
        </Link>

        <nav className="hidden md:flex items-center gap-4">
          <Link href="/marketplace" className="text-sm text-muted-foreground hover:text-foreground">
            Marketplace
          </Link>
          <Link href="/marketplace/resale" className="text-sm text-muted-foreground hover:text-foreground">
            Secondary Market
          </Link>
          <Link href="/profile" className="text-sm text-muted-foreground hover:text-foreground">
            Profile
          </Link>
          <CurrencyToggle />
          <ThemeToggle />

          {/* Notification centre (issue #283): bell + slide-out panel with
              read/unread state management. */}
          <NotificationCenter />

          {isConnected ? (
            <div className="flex items-center gap-2">
              {/* USDC balance (#402) sits next to the connected address. */}
              <UsdcBalanceChip address={address!} network={network} />
              <WalletChip
                address={address!}
                network={network}
                onDisconnect={() => disconnect()}
                onNetworkChange={refreshNetwork}
              />
            </div>
          ) : (
            <Button
              onClick={() => setConnectOpen(true)}
              disabled={isConnecting}
              className="cursor-default"
              data-testid="connect-wallet-button"
            >
              <Wallet className="mr-2 h-4 w-4" />
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </Button>
          )}
        </nav>
      </div>

      <ConnectWalletModal open={connectOpen} onOpenChange={setConnectOpen} />
    </header>
  );
}

