/**
 * Stellar USDC balance lookups via Horizon.
 *
 * USDC on Stellar is a classic asset: an account holds a trustline under
 * Circle's issuer, so the balance comes from the account's balance list rather
 * than a contract query.
 */

import type { Network } from "@/lib/stellar";

export interface UsdcAsset {
  assetCode: string;
  /** Circle's asset issuer on this network. */
  assetIssuer: string;
}

const TESTNET_USDC_ISSUER =
  "GBBDN7L42JAAFLCW2XYYN62YQH5AWCWQ2R2SGEHX6E2ARXEHXWZ4YMW";
const MAINNET_USDC_ISSUER =
  "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

/** Stellar amounts carry 7 decimal places. */
export const STELLAR_DECIMALS = 7;

const HORIZON_URLS: Record<Network, string> = {
  testnet: "https://horizon-testnet.stellar.org",
  mainnet: "https://horizon.stellar.org",
};

function resolveHorizonUrl(network: Network): string {
  const fromEnv = process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL;
  // The env var is authoritative so a self-hosted Horizon or a test stub works.
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return HORIZON_URLS[network];
}

/** The USDC asset code and issuer for a given network. */
export function getUsdcAsset(network: Network = "testnet"): UsdcAsset {
  return {
    assetCode: "USDC",
    assetIssuer: network === "mainnet" ? MAINNET_USDC_ISSUER : TESTNET_USDC_ISSUER,
  };
}

interface HorizonBalance {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
  limit?: string;
}

/**
 * Returns the account's USDC balance as a number.
 *
 * Resolves to 0 when the account does not yet hold a USDC trustline — that is a
 * valid zero balance, not a failure, so the UI shows an empty wallet and offers
 * a top-up rather than an error.
 */
export async function fetchUsdcBalance(
  address: string,
  network: Network = "testnet"
): Promise<number> {
  if (!address) return 0;

  const url = `${resolveHorizonUrl(network)}/accounts/${encodeURIComponent(address)}`;
  const res = await fetch(url);

  if (res.status === 404) {
    // An unfunded account has no Horizon record at all.
    return 0;
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch USDC balance (${res.status})`);
  }

  const account = (await res.json()) as { balances?: HorizonBalance[] };
  const balances = account.balances ?? [];

  const match = balances.find(
    (entry) =>
      entry.asset_type === "credit_alphanum4" &&
      entry.asset_code === "USDC" &&
      entry.asset_issuer === getUsdcAsset(network).assetIssuer
  );

  if (!match) return 0;

  return Number(match.balance);
}

/** Formats a raw Horizon string balance for display. */
export function parseStellarAmount(raw: string | number | null | undefined): number {
  const num = typeof raw === "string" ? Number(raw) : Number(raw ?? 0);
  return Number.isNaN(num) ? 0 : num;
}
