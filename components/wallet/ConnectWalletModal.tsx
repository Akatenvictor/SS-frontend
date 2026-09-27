"use client";

/**
 * Connect Wallet modal (issue #379)
 *
 * Lists the supported Stellar wallets and only lets the user pick one that is
 * actually installed — when an extension is missing the entry links to its
 * download page instead of failing silently on click.
 */

import { useEffect, useState } from "react";
import { Download, Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SUPPORTED_WALLETS,
  WALLET_INSTALL_URLS,
  WALLET_LABELS,
  isWalletAvailable,
  type WalletKind,
} from "@/lib/stellar";
import { useWallet } from "@/context/WalletContext";

interface ConnectWalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectWalletModal({ open, onOpenChange }: ConnectWalletModalProps) {
  const { connect, isConnecting, error } = useWallet();
  const [availability, setAvailability] = useState<Record<string, boolean> | null>(null);

  // Detection is async because Freighter's probe is, and it only needs to run
  // while the modal is actually on screen.
  useEffect(() => {
    if (!open) {
      setAvailability(null);
      return;
    }

    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        SUPPORTED_WALLETS.map(async (wallet) => [wallet, await isWalletAvailable(wallet)] as const)
      );
      if (!cancelled) {
        setAvailability(Object.fromEntries(entries));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  async function handleSelect(wallet: WalletKind) {
    const connected = await connect(wallet);
    if (connected) {
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="connect-wallet-modal" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect a wallet</DialogTitle>
          <DialogDescription>
            Choose a Stellar wallet to connect to StellarSettle.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {SUPPORTED_WALLETS.map((wallet) => {
            const installed = availability?.[wallet];
            const isPending = isConnecting;

            if (installed === false) {
              return (
                <div
                  key={wallet}
                  data-testid={`wallet-option-${wallet}`}
                  className="flex items-center justify-between rounded-lg border border-dashed p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{WALLET_LABELS[wallet]}</p>
                    <p data-testid={`wallet-not-installed-${wallet}`} className="text-xs text-muted-foreground">
                      Extension not detected
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={WALLET_INSTALL_URLS[wallet]}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid={`wallet-install-${wallet}`}
                    >
                      <Download />
                      Install
                    </a>
                  </Button>
                </div>
              );
            }

            return (
              <Button
                key={wallet}
                type="button"
                variant="outline"
                className="h-auto w-full justify-start gap-3 p-3"
                disabled={isPending}
                onClick={() => handleSelect(wallet)}
                data-testid={`wallet-option-${wallet}`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                  <Wallet className="h-4 w-4" />
                </span>
                <span className="flex-1 text-left">
                  <span className="block text-sm font-medium">{WALLET_LABELS[wallet]}</span>
                  <span className="block text-xs text-muted-foreground">
                    {installed === true ? "Extension detected" : "Checking for extension…"}
                  </span>
                </span>
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              </Button>
            );
          })}
        </div>

        {error && (
          <p data-testid="connect-wallet-error" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
