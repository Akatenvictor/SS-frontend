"use client";

import Link from "next/link";
import { usePageTitle } from "@/hooks/usePageTitle";
import { MAX_COMPARE_INVOICES, useComparison } from "@/components/marketplace/InvoiceComparisonContext";
import { InvoiceComparisonTable } from "@/components/marketplace/InvoiceComparisonTable";
import { Button } from "@/components/ui/button";

export default function ComparePage() {
  const { compareInvoices, clearComparison } = useComparison();
  usePageTitle("Compare invoices");

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Compare invoices</h1>
          <p className="text-sm text-muted-foreground">
            {compareInvoices.length > 0
              ? `Comparing ${compareInvoices.length} of ${MAX_COMPARE_INVOICES} selected invoices.`
              : `Select up to ${MAX_COMPARE_INVOICES} invoices from the marketplace to compare them.`}
          </p>
        </div>
        {compareInvoices.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearComparison}
            data-testid="compare-page-clear"
          >
            Clear all
          </Button>
        )}
      </div>

      {compareInvoices.length === 0 ? (
        <div
          data-testid="compare-empty"
          className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center"
        >
          <h2 className="text-xl font-semibold">Nothing to compare yet</h2>
          <p className="text-muted-foreground">
            Pick invoices in the marketplace to see them side by side here.
          </p>
          <Button asChild>
            <Link href="/marketplace">Browse the marketplace</Link>
          </Button>
        </div>
      ) : (
        <InvoiceComparisonTable invoices={compareInvoices} />
      )}
    </main>
  );
}
