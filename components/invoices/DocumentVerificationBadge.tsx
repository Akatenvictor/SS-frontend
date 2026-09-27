"use client";

/**
 * Document integrity badge (issue #412).
 *
 * Checks, client-side, that the IPFS gateway serves exactly the content the
 * invoice's CID commits to (see lib/cidVerification). Runs in the background:
 * the document viewer never waits on it. Definitive results are cached per CID
 * in sessionStorage so revisiting a document doesn't re-download its block.
 */

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2, ShieldCheck, ShieldQuestion } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  extractRootCid,
  readCachedVerification,
  verifyCid,
  writeCachedVerification,
  type VerificationStatus,
} from "@/lib/cidVerification";

export const VERIFICATION_TOOLTIPS = {
  verifying:
    "Checking this document's integrity: fetching its raw IPFS block and comparing its SHA-256 hash to the CID recorded for this invoice.",
  verified:
    "Verified: the SHA-256 hash of the document's IPFS block matches the CID recorded for this invoice, so the content has not been altered since it was registered.",
  mismatch:
    "Unverified: the content served for this document does not match the CID recorded for this invoice. It may have been altered or served by a faulty gateway.",
  unavailable:
    "Not verified: the integrity check could not be completed (the document is not on IPFS, uses an unsupported hash, or no gateway could serve its raw block). This is not evidence of tampering.",
} as const;

const LABELS = {
  verifying: "Verifying…",
  verified: "Verified",
  mismatch: "Unverified",
  unavailable: "Not verified",
} as const;

interface DocumentVerificationBadgeProps {
  /** The document reference as stored for the invoice (ipfs://, CID, or gateway URL). */
  documentUrl: string;
  /** Injectable for tests. */
  verify?: (cid: string) => Promise<VerificationStatus>;
}

export function DocumentVerificationBadge({
  documentUrl,
  verify = verifyCid,
}: DocumentVerificationBadgeProps) {
  const cid = extractRootCid(documentUrl);

  const { data, isPending } = useQuery({
    queryKey: ["ipfs-cid-verification", cid],
    queryFn: async () => {
      const status = await verify(cid as string);
      writeCachedVerification(cid as string, status);
      return status;
    },
    enabled: cid !== null,
    initialData: () => (cid ? (readCachedVerification(cid) ?? undefined) : undefined),
    staleTime: Infinity,
    retry: false,
  });

  // Not an IPFS document: there is no CID to verify against.
  if (!cid) return null;

  const state: keyof typeof LABELS = isPending ? "verifying" : (data ?? "unavailable");
  const Icon =
    state === "verifying"
      ? Loader2
      : state === "verified"
        ? ShieldCheck
        : state === "mismatch"
          ? AlertTriangle
          : ShieldQuestion;
  const variant = state === "verified" ? "default" : state === "mismatch" ? "destructive" : "outline";

  return (
    <div className="flex flex-col gap-1" data-testid="document-verification">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="w-fit rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`${LABELS[state]}. ${VERIFICATION_TOOLTIPS[state]}`}
            >
              <Badge variant={variant} data-testid={`document-verification-${state}`}>
                <Icon className={state === "verifying" ? "animate-spin" : undefined} aria-hidden="true" />
                {LABELS[state]}
              </Badge>
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{VERIFICATION_TOOLTIPS[state]}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {state === "mismatch" && (
        <p role="alert" className="text-xs text-destructive" data-testid="document-verification-warning">
          Warning: this document does not match its registered IPFS CID. Do not rely on it
          without confirming with the issuer.
        </p>
      )}
    </div>
  );
}
