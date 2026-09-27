"use client";

import { useCompareContext } from "@/context/CompareContext";
import { CompareTable } from "@/components/compare";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function ComparePage() {
  const { items, clear, maxItems } = useCompareContext();
  usePageTitle("Compare invoices");

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Compare invoices</h1>
          <p className="text-sm text-muted-foreground">
            {items.length > 0
              ? `Comparing ${items.length} of ${maxItems} selected invoices.`
              : "Select invoices from the marketplace to compare them."}
          </p>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={clear}
            data-testid="compare-page-clear"
            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      <CompareTable items={items} />
    </main>
  );
}
