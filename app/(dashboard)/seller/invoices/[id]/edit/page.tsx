"use client";

import { use } from "react";
import { EditInvoiceForm } from "@/components/invoices/EditInvoiceForm";
import { DeadlineExtensionForm } from "@/components/invoices/DeadlineExtensionForm";

export default function SellerInvoiceEditPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
      <EditInvoiceForm invoiceId={resolvedParams.id} />
      <DeadlineExtensionForm
        currentDeadline={new Date().toISOString()}
        invoiceStatus="open"
        invoiceId={resolvedParams.id}
      />
    </div>
  );
}
