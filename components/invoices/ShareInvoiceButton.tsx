"use client";

import { useEffect, useRef, useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** How long the 'Copied!' confirmation stays up before the icon returns. */
const COPIED_FEEDBACK_MS = 2000;

/**
 * Copies the current invoice's full URL to the clipboard.
 *
 * The button is client-only: it reads `window.location` and the Clipboard API,
 * neither of which exists during SSR, so it renders nothing until mounted.
 * Where the Clipboard API is unavailable (older browsers, insecure origins)
 * it falls back to a `window.prompt` pre-filled with the URL so the user can
 * copy it by hand.
 */
export function ShareInvoiceButton() {
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  if (!mounted) {
    return null;
  }

  const showCopiedFeedback = () => {
    setCopied(true);
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
  };

  const handleShare = async () => {
    const url = window.location.href;

    if (!navigator.clipboard?.writeText) {
      window.prompt("Copy this invoice link:", url);
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      showCopiedFeedback();
    } catch {
      // A rejected clipboard write (denied permission, non-focused document)
      // leaves the user with no link at all, so fall back to the prompt.
      window.prompt("Copy this invoice link:", url);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleShare}
      aria-label="Share invoice"
    >
      {copied ? (
        "Copied!"
      ) : (
        <Share2 aria-hidden="true" data-testid="share-icon" />
      )}
    </Button>
  );
}
