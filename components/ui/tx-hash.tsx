"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ExternalLink, Copy, Check } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type Network = "mainnet" | "testnet";

/**
 * The network this deployment targets.
 *
 * Read from `NEXT_PUBLIC_STELLAR_NETWORK` so explorer links follow the
 * environment rather than each page hardcoding one — the codebase had drifted
 * between `public/tx` and `testnet/tx`, which silently sends users to an
 * explorer that cannot resolve their transaction. Defaults to testnet to match
 * `.env.example`, which is what the app runs against.
 */
export const DEFAULT_NETWORK: Network =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK === "mainnet" ? "mainnet" : "testnet";

/**
 * Stellar Expert explorer transaction pages.
 *
 * Public (mainnet) and testnet live under different path segments, so the
 * network cannot be inferred from the host — callers pass it explicitly.
 * Exported so pages that only need a link (no copy affordance) build the same
 * URL the component does, instead of hardcoding the base a third time.
 */
export const STELLAR_EXPLORER_BASE = {
  mainnet: "https://stellar.expert/explorer/public/tx",
  testnet: "https://stellar.expert/explorer/testnet/tx",
} as const;

/** Full explorer URL for a transaction hash on the given network. */
export function stellarExplorerTxUrl(
  hash: string,
  network: Network = DEFAULT_NETWORK,
): string {
  return `${STELLAR_EXPLORER_BASE[network]}/${hash}`;
}

interface TxHashProps {
  hash: string;
  network?: Network;
  className?: string;
  showLabel?: boolean;
  truncateLength?: { start: number; end: number };
  /** Overrides the default test id, for per-row targeting in table tests. */
  testId?: string;
}

function truncateHash(hash: string, start = 6, end = 4): string {
  if (hash.length <= start + end + 1) return hash;
  // `slice(-0)` is `slice(0)`, which would return the whole hash — so the
  // prefix-only case has to be handled before reaching for it.
  if (end <= 0) return `${hash.slice(0, start)}…`;
  return `${hash.slice(0, start)}…${hash.slice(-end)}`;
}

/**
 * Copies `text` to the clipboard, falling back for browsers/contexts where the
 * async Clipboard API is unavailable.
 *
 * `navigator.clipboard` is only exposed in secure contexts, so it is
 * `undefined` on plain-http origins and inside some older browsers. Without
 * this fallback the copy button would silently do nothing there — see
 * `execCommand` below.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied or a non-user-initiated call — fall through.
    }
  }
  return legacyCopy(text);
}

function legacyCopy(text: string): boolean {
  if (typeof document === "undefined" || !document.body) return false;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  // Keep it out of view and out of the tab order, and avoid scrolling the
  // page when it receives focus.
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  try {
    textarea.select();
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

/** Shared copy-to-clipboard handler with the 2s "copied" reset, cleaned up on unmount. */
function useCopyWithFeedback(hash: string) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clearing on unmount avoids setting state on an unmounted component when the
  // user copies and navigates away inside the 2s window.
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const copy = useCallback(async () => {
    const ok = await copyToClipboard(hash);
    if (!ok) return;
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 2000);
  }, [hash]);

  return { copied, copy };
}

export function TxHash({
  hash,
  network = DEFAULT_NETWORK,
  className,
  showLabel = false,
  truncateLength = { start: 6, end: 4 },
  testId,
}: TxHashProps) {
  const { copied, copy } = useCopyWithFeedback(hash);

  const explorerUrl = stellarExplorerTxUrl(hash, network);

  const displayHash = truncateHash(hash, truncateLength.start, truncateLength.end);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 cursor-pointer select-all font-mono text-sm",
              "hover:text-primary transition-colors",
              className
            )}
            onClick={copy}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                copy();
              }
            }}
            aria-label={copied ? "Copied to clipboard" : "Copy transaction hash"}
            title={hash}
          >
            {showLabel && <span className="text-xs text-muted-foreground">Tx:</span>}
            <span data-testid={testId ?? "tx-hash-display"}>{displayHash}</span>
            {copied ? (
              <Check className="size-3.5 text-green-500 animate-in fade-in zoom-in" aria-hidden="true" />
            ) : (
              <Copy className="size-3.5 text-muted-foreground hover:text-foreground transition-colors" aria-hidden="true" />
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" align="center">
          <div className="flex flex-col gap-1 p-2">
            <p className="font-mono text-xs">{hash}</p>
            <p className="text-xs text-muted-foreground">
              Click to copy {copied ? "✓ Copied!" : ""}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-primary transition-colors ml-1"
            aria-label={`View on Stellar Expert (${network})`}
            data-testid="tx-hash-explorer-link"
          >
            <ExternalLink className="size-3.5" aria-hidden="true" />
            <span className="sr-only">View on Stellar Expert ({network})</span>
          </a>
        </TooltipTrigger>
        <TooltipContent side="top" align="center">
          View transaction on Stellar Expert ({network})
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function TxHashFull({
  hash,
  network = DEFAULT_NETWORK,
  className,
  showNetwork = true,
}: {
  hash: string;
  network?: Network;
  className?: string;
  showNetwork?: boolean;
}) {
  const { copied, copy } = useCopyWithFeedback(hash);

  const explorerUrl = stellarExplorerTxUrl(hash, network);

  return (
    <TooltipProvider>
      <div className={cn("inline-flex items-center gap-2 font-mono text-sm", className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className="cursor-pointer select-all hover:text-primary transition-colors"
              onClick={copy}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  copy();
                }
              }}
              aria-label={copied ? "Copied to clipboard" : "Copy transaction hash"}
              title={hash}
            >
              {hash}
              {copied && (
                <Check className="size-3.5 text-green-500 animate-in fade-in zoom-in ml-1" aria-hidden="true" />
              )}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" align="center">
            <p className="text-xs text-muted-foreground">
              {copied ? "✓ Copied to clipboard!" : "Click to copy full hash"}
            </p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
              aria-label={`View on Stellar Expert (${network})`}
              data-testid="tx-hash-full-explorer-link"
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
              {showNetwork && <span className="text-xs hidden sm:inline">{network}</span>}
            </a>
          </TooltipTrigger>
          <TooltipContent side="top" align="center">
            View on Stellar Expert ({network})
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}