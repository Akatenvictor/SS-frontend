/**
 * IPFS document helpers (issue #376)
 *
 * Invoice documents are stored on IPFS, but the API returns them in whichever
 * form the issuer happened to record — a bare `ipfs://` URI, a CID, or a URL
 * already pointed at a gateway. Browsers cannot fetch any of those directly,
 * so every form is resolved to a gateway URL and, for a document that fails
 * to load, a second gateway is offered before the user is told it is broken.
 */

/** Public gateways tried in order. */
export const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://dweb.link/ipfs/",
] as const;

const CID_PATTERN = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{20,})$/;

export function isIpfsUri(url: string): boolean {
  return url.startsWith("ipfs://");
}

export function isCid(value: string): boolean {
  return CID_PATTERN.test(value.trim());
}

/** True for any of the three shapes the API might hand us. */
export function isIpfsReference(url: string): boolean {
  return isIpfsUri(url) || isCid(url);
}

/** Same as `resolveIpfsUrl` but returns every candidate, for retrying. */
export function ipfsGatewayCandidates(url: string): string[] {
  if (!url) return [];

  // Already an http(s) URL — presumably gateway-backed already.
  if (/^https?:\/\//i.test(url)) return [url];

  const cid = isIpfsUri(url) ? url.slice("ipfs://".length) : url;
  // Sub-paths (`ipfs://cid/invoice.pdf`) must keep everything after the CID.
  const [root, ...rest] = cid.split("/");
  const suffix = rest.length ? `/${rest.join("/")}` : "";

  return IPFS_GATEWAYS.map((gateway) => `${gateway}${root}${suffix}`);
}

/** Resolves any supported reference to the first gateway URL. */
export function resolveIpfsUrl(url: string): string | null {
  return ipfsGatewayCandidates(url)[0] ?? null;
}

export type DocumentKind = "pdf" | "image" | "other";

/** Chooses the inline viewer to use, based on the file extension. */
export function guessDocumentKind(url: string): DocumentKind {
  const withoutQuery = url.split("?")[0].toLowerCase();
  if (withoutQuery.endsWith(".pdf")) return "pdf";
  if (/\.(png|jpe?g|gif|webp|avif|bmp|svg)$/.test(withoutQuery)) return "image";
  return "other";
}

/** Human-readable file name for the document list. */
export function documentFileName(url: string, fallback = "invoice-document"): string {
  const withoutQuery = url.split("?")[0];
  const lastSegment = withoutQuery.split("/").filter(Boolean).pop();
  if (!lastSegment) return fallback;
  // A bare CID has no extension — label it by what it is instead.
  return isCid(lastSegment) ? `${fallback}.pdf` : lastSegment;
}
