"use client";

import { useComparison } from "./InvoiceComparisonContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Scale } from "lucide-react";
import { InvoiceComparisonModal } from "./InvoiceComparisonModal";
import { useState } from "react";

export function InvoiceComparisonBar() {
  const { compareInvoices, removeFromCompare, clearComparison } = useComparison();
  const [modalOpen, setModalOpen] = useState(false);

  if (compareInvoices.length === 0) return null;

  return (
    <>
      <Card className="fixed bottom-0 left-0 right-0 z-40 border-t shadow-lg">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Scale className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">
                {compareInvoices.length} invoice{compareInvoices.length > 1 ? "s" : ""} selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              {compareInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center gap-2 bg-secondary px-3 py-1.5 rounded-md"
                >
                  <span className="text-sm font-medium truncate max-w-[150px]">
                    {invoice.title}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0"
                    onClick={() => removeFromCompare(invoice.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearComparison}
                disabled={compareInvoices.length === 0}
              >
                Clear
              </Button>
              <Button
                size="sm"
                onClick={() => setModalOpen(true)}
                disabled={compareInvoices.length < 2}
              >
                Compare
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <InvoiceComparisonModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        invoices={compareInvoices}
      />
    </>
  );
}
