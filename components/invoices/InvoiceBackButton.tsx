"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Navigates back to the previous page, or to the marketplace when there is
 * no history entry. Client-only: renders nothing during SSR.
 */
export function InvoiceBackButton() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/marketplace");
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleBack}
      aria-label="Go back"
      data-testid="invoice-back-button"
    >
      <ArrowLeft aria-hidden="true" className="h-5 w-5" />
    </Button>
  );
}
