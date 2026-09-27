"use client";

import { useParams } from "next/navigation";
import { InvoiceDetailView } from "@/components/invoices/InvoiceDetailView";
import { PriceHistoryChart } from "@/components/marketplace/PriceHistoryChart";

/**
 * Marketplace deep link to an invoice. Renders the same view as the canonical
 * `/invoices/[id]` route so links from the grid, notifications and
 * notifications' "listing sold" events all land on one implementation, plus
 * the secondary market price history chart (#413) — kept out of the shared
 * InvoiceDetailView since it's specific to an invoice's resale listings, not
 * relevant to the generic /invoices/[id] view.
 */
export default function MarketplaceInvoiceDetailPage() {
  const params = useParams<{ id: string }>();

  return (
    <main className="container mx-auto px-4 py-8 pb-24">
      <InvoiceDetailView invoiceId={params.id} />
      <div className="mt-6">
        <PriceHistoryChart invoiceId={params.id} />
      </div>
    </main>
  );
}
