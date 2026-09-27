"use client";

/**
 * Wallet session context (issue #379)
 *
 * A single shared source of truth for the connected Stellar wallet. Before
 * this, `useStellarWallet` was a plain `useState` hook, so every consumer
 * (`Navbar`, `MobileNav`, …) held its own copy and connecting from one place
 * left the others stale. The session is persisted to local storage so a page
 * refresh keeps the user connected, and disconnecting clears it and returns
 * the user to the home page.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  clearStoredWalletSession,
  connectWithWallet,
  getNetwork,
  isWalletAvailable,
  normalizeAlbedoNetwork,
  readStoredWalletSession,
  revokeProviderSession,
  truncateAddress,
  writeStoredWalletSession,
  type Network,
  type WalletConnection,
  type WalletKind,
} from "@/lib/stellar";

export interface WalletContextValue {
  address: string | null;
  network: Network | null;
  wallet: WalletKind | null;
  isConnected: boolean;
  isConnecting: boolean;
  isInitializing: boolean;
  /** Set when a connect attempt failed, so the modal can explain why. */
  error: string | null;
  truncatedAddress: string | null;
  connect: (wallet: WalletKind) => Promise<boolean>;
  disconnect: (options?: { redirect?: boolean }) => void;
  refreshNetwork: () => Promise<void>;
}

/**
 * Disconnected stand-in used when a component renders outside a provider.
 *
 * Gated actions (invest, transfer, buy a fraction) are scattered across the
 * app and are also rendered in isolation by tests, so falling back to "no
 * wallet" keeps them rendering instead of throwing. Inside the real app tree
 * `components/providers.tsx` always supplies a live provider.
 */
const disconnectedWalletValue: WalletContextValue = {
  address: null,
  network: null,
  wallet: null,
  isConnected: false,
  isConnecting: false,
  isInitializing: false,
  error: null,
  truncatedAddress: null,
  connect: async () => false,
  disconnect: () => {},
  refreshNetwork: async () => {},
};

const WalletContext = createContext<WalletContextValue>(disconnectedWalletValue);

export function WalletProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [address, setAddress] = useState<string | null>(null);
  const [network, setNetwork] = useState<Network | null>(null);
  const [wallet, setWallet] = useState<WalletKind | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Restore the persisted session on mount. The stored address is trusted for
  // display without re-prompting the extension, so a refresh never forces the
  // user to authorise again.
  useEffect(() => {
    const stored = readStoredWalletSession();
    if (stored) {
      setAddress(stored.address);
      setNetwork(stored.network);
      setWallet(stored.wallet);
    }
    setIsInitializing(false);
  }, []);

  const connect = useCallback(async (walletKind: WalletKind) => {
    setIsConnecting(true);
    setError(null);
    try {
      const available = await isWalletAvailable(walletKind);
      if (!available) {
        setError("Wallet extension not detected");
        return false;
      }

      const result: WalletConnection | null = await connectWithWallet(walletKind);
      if (!result) {
        setError("Connection request was declined");
        return false;
      }

      setAddress(result.address);
      setNetwork(result.network);
      setWallet(result.wallet);
      writeStoredWalletSession({
        wallet: result.wallet,
        address: result.address,
        network: result.network,
      });
      return true;
    } catch {
      setError("Failed to connect wallet");
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(
    (options?: { redirect?: boolean }) => {
      const shouldRedirect = options?.redirect ?? true;
      const previousWallet = wallet;

      setAddress(null);
      setNetwork(null);
      setWallet(null);
      setError(null);
      clearStoredWalletSession();
      void revokeProviderSession(previousWallet);

      if (shouldRedirect) {
        router.push("/");
      }
    },
    [router, wallet]
  );

  const refreshNetwork = useCallback(async () => {
    const stored = readStoredWalletSession();
    if (!stored) return;

    let next: Network | null = null;
    if (stored.wallet === "albedo") {
      try {
        next = normalizeAlbedoNetwork(await window.albedo?.network());
      } catch {
        // Keep the last known network.
      }
    } else {
      next = await getNetwork();
    }

    if (next) {
      setNetwork(next);
      writeStoredWalletSession({ ...stored, network: next });
    }
  }, []);

  const value = useMemo<WalletContextValue>(
    () => ({
      address,
      network,
      wallet,
      isConnected: address !== null,
      isConnecting,
      isInitializing,
      error,
      truncatedAddress: address ? truncateAddress(address) : null,
      connect,
      disconnect,
      refreshNetwork,
    }),
    [address, network, wallet, isConnecting, isInitializing, error, connect, disconnect, refreshNetwork]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  return useContext(WalletContext);
}
