"use client";

import { useParams } from "next/navigation";
import { InvoiceDetailView } from "@/components/invoices/InvoiceDetailView";

/** Canonical invoice detail route (issue #376). */
export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();

  return (
    <main className="container mx-auto px-4 py-8 pb-24">
      <InvoiceDetailView invoiceId={params.id} />
    </main>
  );
}
