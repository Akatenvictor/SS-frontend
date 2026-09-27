"use client";

import { useEffect } from "react";
import { logError } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { GoToMarketplaceButton } from "@/components/layout/GoToMarketplaceButton";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Router-level error boundary catching unhandled render errors anywhere below
 * the root layout.
 *
 * The error is sent to the client-side logger before the fallback renders, so
 * a crash is still recorded even though the user only sees the friendly page.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    logError("Unhandled render error", error);
  }, [error]);

  return (
    <main className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 py-8 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="text-muted-foreground">
        An unexpected error occurred. You can try again or head back to the
        marketplace.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
        <GoToMarketplaceButton />
      </div>
    </main>
  );
}
