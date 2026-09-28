"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InvoiceComparisonTable } from "@/components/marketplace/InvoiceComparisonTable";
import { MAX_COMPARE_INVOICES } from "@/components/marketplace/InvoiceComparisonContext";
import type { Invoice } from "@/lib/api";

interface InvoiceComparisonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoices: Invoice[];
}

/** Compact view of the comparison, sharing the table with the full page. */
export function InvoiceComparisonModal({
  open,
  onOpenChange,
  invoices,
}: InvoiceComparisonModalProps) {
  if (invoices.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compare Invoices</DialogTitle>
          <DialogDescription>
            Comparing {invoices.length} of {MAX_COMPARE_INVOICES} selected invoices.{" "}
            <Link href="/marketplace/compare" className="underline">
              Open the full comparison
            </Link>
          </DialogDescription>
        </DialogHeader>

        <InvoiceComparisonTable invoices={invoices} />
      </DialogContent>
    </Dialog>
  );
}
