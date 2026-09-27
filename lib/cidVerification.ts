/**
 * Client-side IPFS document integrity check (issue #412).
 *
 * A CID commits to the SHA-256 of an IPFS *block*, not to the raw file bytes:
 * a typical UnixFS document (`Qm…` / dag-pb) wraps the file in a protobuf
 * node, so hashing the downloaded file would never match its CID. Instead we
 * fetch the raw block from the gateway's trustless mode (`?format=raw`,
 * `Accept: application/vnd.ipld.raw`) and compare its SHA-256 to the digest
 * encoded in the CID. That works for both dag-pb and raw CIDs.
 *
 * Scope: this verifies the document's root block, which is the whole document
 * for files stored as a single block (small files, and every raw-leaf CID). For
 * large multi-block files the root block commits to the hashes of every chunk,
 * so a verified root still proves the gateway is serving the registered DAG.
 */

import { IPFS_GATEWAYS, isCid, isIpfsUri } from "@/lib/ipfs";

export type VerificationStatus =
  /** Raw block hash matches the CID. */
  | "verified"
  /** Raw block was fetched but its hash does NOT match the CID. */
  | "mismatch"
  /** Could not check (not an IPFS document, unsupported hash, gateway down). */
  | "unavailable";

const SHA2_256 = 0x12;
const SHA2_256_LENGTH = 32;

// ── Minimal multibase decoding (no dependency) ───────────────────────────────

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function base58btcDecode(input: string): Uint8Array | null {
  const bytes: number[] = [0];
  for (const char of input) {
    const value = BASE58_ALPHABET.indexOf(char);
    if (value < 0) return null;
    let carry = value;
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  // Leading '1's encode leading zero bytes.
  for (const char of input) {
    if (char !== "1") break;
    bytes.push(0);
  }
  // Strip the zero we seeded with unless the input was all '1's.
  const out = bytes.reverse();
  const firstNonZero = out.findIndex((b) => b !== 0);
  const leadingOnes = input.length - input.replace(/^1+/, "").length;
  const start = firstNonZero === -1 ? out.length - leadingOnes : Math.max(0, firstNonZero - leadingOnes);
  return Uint8Array.from(out.slice(start));
}

const BASE32_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";

/** RFC 4648 base32, lowercase, unpadded — multibase prefix `b`. */
export function base32Decode(input: string): Uint8Array | null {
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of input.toLowerCase()) {
    const value = BASE32_ALPHABET.indexOf(char);
    if (value < 0) return null;
    buffer = (buffer << 5) | value;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return Uint8Array.from(out);
}

function readVarint(bytes: Uint8Array, offset: number): [value: number, next: number] | null {
  let value = 0;
  let shift = 0;
  for (let i = offset; i < bytes.length && shift < 28; i++) {
    value |= (bytes[i] & 0x7f) << shift;
    if ((bytes[i] & 0x80) === 0) return [value, i + 1];
    shift += 7;
  }
  return null;
}

/**
 * Extract the SHA-256 digest a CID commits to. Supports CIDv0 (`Qm…`) and
 * base32 CIDv1 (`b…`); returns null for anything else (other multibases or
 * hash functions), which the caller reports as "unavailable", never mismatch.
 */
export function cidSha256Digest(cid: string): Uint8Array | null {
  const value = cid.trim();
  let multihash: Uint8Array | null = null;

  if (value.startsWith("Qm")) {
    // CIDv0 is a bare base58btc multihash.
    multihash = base58btcDecode(value);
  } else if (value.startsWith("b")) {
    const bytes = base32Decode(value.slice(1));
    if (!bytes) return null;
    const version = readVarint(bytes, 0);
    if (!version || version[0] !== 1) return null;
    const codec = readVarint(bytes, version[1]);
    if (!codec) return null;
    multihash = bytes.slice(codec[1]);
  }

  if (!multihash) return null;
  const fn = readVarint(multihash, 0);
  if (!fn || fn[0] !== SHA2_256) return null;
  const length = readVarint(multihash, fn[1]);
  if (!length || length[0] !== SHA2_256_LENGTH) return null;
  const digest = multihash.slice(length[1]);
  return digest.length === SHA2_256_LENGTH ? digest : null;
}

/** Root CID of a document reference (`ipfs://cid/…`, bare CID, or gateway URL). */
export function extractRootCid(reference: string): string | null {
  if (!reference) return null;
  let path = reference.trim();
  if (isIpfsUri(path)) {
    path = path.slice("ipfs://".length);
  } else if (/^https?:\/\//i.test(path)) {
    const match = path.match(/\/ipfs\/([^/?#]+)/);
    if (!match) return null;
    path = match[1];
  }
  const root = path.split(/[/?#]/)[0];
  return isCid(root) ? root : null;
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * Fetch the CID's raw block from each gateway in turn and compare hashes.
 * A mismatch on any gateway is reported immediately (that gateway served
 * tampered content); unreachable gateways fall through to the next one.
 */
export async function verifyCid(
  cid: string,
  fetchImpl: typeof fetch = fetch,
  gateways: readonly string[] = IPFS_GATEWAYS,
): Promise<VerificationStatus> {
  const expected = cidSha256Digest(cid);
  if (!expected) return "unavailable";

  for (const gateway of gateways) {
    try {
      const res = await fetchImpl(`${gateway}${cid}?format=raw`, {
        headers: { Accept: "application/vnd.ipld.raw" },
      });
      if (!res.ok) continue;
      const block = new Uint8Array(await res.arrayBuffer());
      const actual = new Uint8Array(await crypto.subtle.digest("SHA-256", block));
      return equalBytes(actual, expected) ? "verified" : "mismatch";
    } catch {
      // Network/CORS failure — try the next gateway.
    }
  }
  return "unavailable";
}

// ── Session cache ────────────────────────────────────────────────────────────

const CACHE_PREFIX = "ss:cid-verification:";

/** Only definitive results are cached; "unavailable" is retried next time. */
export function readCachedVerification(cid: string): VerificationStatus | null {
  try {
    const value = window.sessionStorage.getItem(CACHE_PREFIX + cid);
    return value === "verified" || value === "mismatch" ? value : null;
  } catch {
    return null;
  }
}

export function writeCachedVerification(cid: string, status: VerificationStatus): void {
  if (status === "unavailable") return;
  try {
    window.sessionStorage.setItem(CACHE_PREFIX + cid, status);
  } catch {
    // Storage full or disabled — verification still works, just uncached.
  }
}
