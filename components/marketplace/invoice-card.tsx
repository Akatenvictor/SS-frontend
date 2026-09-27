import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FundingProgressBar } from "@/components/invoices/FundingProgressBar";
import { AddToCompareButton } from "@/components/compare/AddToCompareButton";
import { CountdownTimer, isExpired } from "./countdown-timer";
import type { Invoice } from "@/lib/api";

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  open: "default",
  funded: "secondary",
  settled: "outline",
};

interface InvoiceCardProps {
  invoice: Invoice;
  onInvest?: (invoiceId: string) => void;
}

export function InvoiceCard({ invoice, onInvest }: InvoiceCardProps) {
  const published = invoice.status === "open";
  const expired = isExpired(invoice.due_date);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-1 text-base">
            {invoice.title}
          </CardTitle>
          <Badge variant={statusVariant[invoice.status]}>
            {invoice.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">
            {invoice.amount.toLocaleString()} XLM
          </span>
          <CountdownTimer deadline={invoice.due_date} published={published} />
        </div>

        <FundingProgressBar
          raised={invoice.raised}
          target={invoice.amount}
          investorCount={invoice.investor_count}
        />

        <Button
          className="mt-auto w-full"
          disabled={!published || expired}
          onClick={() => onInvest?.(invoice.id)}
        >
          {expired ? "Expired" : "Invest"}
        </Button>

        <div className="flex justify-end">
          <AddToCompareButton invoice={invoice} showLabel={false} />
        </div>
      </CardContent>
    </Card>
  );
}
