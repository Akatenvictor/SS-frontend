"use client";

import { use } from "react";
import { EditInvoiceForm } from "@/components/invoices/EditInvoiceForm";

export default function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <EditInvoiceForm invoiceId={resolvedParams.id} />
    </div>
  );
}
