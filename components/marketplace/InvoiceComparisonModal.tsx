"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Invoice } from "@/lib/api";

interface InvoiceComparisonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoices: Invoice[];
}

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
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-4">
          {invoices.map((invoice) => (
            <Card key={invoice.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold line-clamp-2">{invoice.title}</h3>
                  <Badge
                    variant={
                      invoice.status === "open"
                        ? "default"
                        : invoice.status === "funded"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {invoice.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{invoice.seller}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="font-medium">
                    {invoice.amount.toLocaleString()} XLM
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Raised</span>
                  <span className="font-medium">
                    {invoice.raised.toLocaleString()} XLM
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Yield</span>
                  <span className="font-medium">
                    {invoice.yield_percentage !== undefined
                      ? `${invoice.yield_percentage}%`
                      : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Investors</span>
                  <span className="font-medium">{invoice.investor_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Due Date</span>
                  <span className="font-medium">
                    {new Date(invoice.due_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className="font-medium capitalize">{invoice.status}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
