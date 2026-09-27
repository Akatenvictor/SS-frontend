"use client";

/**
 * Backwards-compatible wallet hook.
 *
 * Wallet state is now owned by `WalletProvider` (issue #379) so that every
 * consumer — the desktop navbar, the mobile tab bar, gated actions — observes
 * the same session. This hook simply re-exports the context so existing call
 * sites keep working unchanged.
 */

import { useWallet, type WalletContextValue } from "@/context/WalletContext";

export type { WalletContextValue };

export function useStellarWallet(): WalletContextValue {
  return useWallet();
}
