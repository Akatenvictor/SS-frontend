"use client";

/**
 * Stellar address validation and explorer links (#421)
 *
 * Thin wrapper over `stellar-sdk` so the address rules live in one place. The
 * wallet-entry points that take a destination — fraction transfer, position
 * transfer, key transfer — all need the same answer, and none of them should
 * re-derive it.
 */

import { StrKey } from "stellar-sdk";

import type { Network } from "@/lib/stellar";

/** Base58 Stellar addresses (ed25519 public keys) start with `G` and are 56 chars. */
export function isValidStellarAddress(address: string | null | undefined): boolean {
  const trimmed = address?.trim();
  if (!trimmed) return false;
  // Rejects contract addresses (C...) and muxed accounts (M...) up front:
  // this is a payment destination, and a contract ID sent to a transfer is a
  // user mistake worth naming rather than a silent no-op on-chain.
  if (!trimmed.startsWith("G")) return false;
  return StrKey.isValidEd25519PublicKey(trimmed);
}

/**
 * Human-readable reason an address cannot receive funds, or `null` if it can.
 *
 * Returns a string rather than a boolean so the transfer modal can tell the
 * user *which* rule they broke, instead of a single "Invalid address".
 */
export function stellarAddressError(address: string | null | undefined): string | null {
  const trimmed = address?.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("C")) {
    return "That's a contract address — enter the recipient's wallet (G…) instead";
  }
  if (trimmed.startsWith("M")) {
    return "That's a muxed account — enter the recipient's base wallet (G…) instead";
  }
  if (!trimmed.startsWith("G")) {
    return "Stellar addresses start with G";
  }
  if (!StrKey.isValidEd25519PublicKey(trimmed)) {
    return "Invalid Stellar address";
  }
  return null;
}

const EXPLORER_BASES: Record<Network, string> = {
  testnet: "https://stellar.expert/explorer/testnet",
  mainnet: "https://stellar.expert/explorer/mainnet",
};

/** Explorer link for a transaction, on the network the app is pointed at. */
export function transactionExplorerUrl(
  txHash: string,
  network: Network = "testnet"
): string {
  return `${EXPLORER_BASES[network]}/tx/${txHash}`;
}
