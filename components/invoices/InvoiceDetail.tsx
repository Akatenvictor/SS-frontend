"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchInvoiceDetail, type InvoiceDetail } from "@/lib/api";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import { useUsdcBalance } from "@/hooks/useUsdcBalance";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { FundingProgressBar } from "@/components/invoices/FundingProgressBar";
import { DocumentPreview } from "@/components/invoices/DocumentPreview";
import { InvestmentModal } from "@/components/invoices/InvestmentModal";
import { CountdownTimer, isExpired } from "@/components/marketplace";
import { ShareInvoiceButton } from "@/components/invoices/ShareInvoiceButton";
import { recordView } from "@/lib/recentlyViewed";

function InvoiceDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-4 w-40 mt-2" />
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-12" />
            </div>
            <Skeleton className="h-3 w-full" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Skeleton className="h-4 w-16 mb-1" />
              <Skeleton className="h-6 w-24" />
            </div>
            <div>
              <Skeleton className="h-4 w-16 mb-1" />
              <Skeleton className="h-6 w-24" />
            </div>
            <div>
              <Skeleton className="h-4 w-16 mb-1" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-28 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

interface InvoiceDetailProps {
  invoiceId: string;
}

export function InvoiceDetail({ invoiceId }: InvoiceDetailProps) {
  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: () => fetchInvoiceDetail(invoiceId),
  });

  const { address, network } = useStellarWallet();
  const { refresh: refreshBalance } = useUsdcBalance(address, network);
  const [investOpen, setInvestOpen] = useState(false);

  usePageTitle(invoice?.title ?? null);

  useEffect(() => {
    if (invoice) {
      recordView({
        id: invoice.id,
        title: invoice.title,
        status: invoice.status,
        amount: invoice.amount,
      });
    }
  }, [invoice]);

  if (isLoading || !invoice) {
    return <InvoiceDetailSkeleton />;
  }

  const published = invoice.status === "open";
  const expired = isExpired(invoice.due_date);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">{invoice.title}</h1>
            <div className="flex items-center gap-2">
              <InvoiceStatusBadge status={invoice.status} />
              <ShareInvoiceButton />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Seller:{" "}
            <Link
              href={`/issuers/${encodeURIComponent(invoice.seller)}`}
              data-testid="issuer-profile-link"
              className="font-medium text-foreground hover:underline"
            >
              {invoice.seller}
            </Link>
          </p>
          <CountdownTimer deadline={invoice.due_date} published={published} />
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Funding Progress</h2>
        </CardHeader>
        <CardContent>
          <FundingProgressBar raised={invoice.raised} target={invoice.amount} investorCount={invoice.investor_count} />
        </CardContent>
      </Card>

      <div data-testid="invest-section">
        {invoice.status === "open" && !expired && (
          <Button
            data-testid="invest-button"
            onClick={() => setInvestOpen(true)}
          >
            Invest
          </Button>
        )}
        {invoice.status === "open" && expired && (
          <p data-testid="invest-expired-message">This invoice has expired</p>
        )}
        {invoice.status === "settled" && (
          <p data-testid="invest-settled-message">This invoice has been settled</p>
        )}
        {invoice.status === "funded" && (
          <p data-testid="invest-funded-message">This invoice is fully funded</p>
        )}
        {invoice.status === "draft" && null}
      </div>

      <InvestmentModal
        invoiceId={invoice.id}
        invoiceTitle={invoice.title}
        maxAmount={Math.max(invoice.amount - invoice.raised, 0)}
        address={address}
        network={network}
        open={investOpen}
        onOpenChange={setInvestOpen}
        onInvested={refreshBalance}
      />

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Investors</h2>
        </CardHeader>
        <CardContent className="space-y-3">
          {invoice.investors.map((investor) => (
            <div key={investor.address} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-mono">
                  {investor.address.slice(0, 2)}
                </div>
                <div>
                  <p className="font-mono text-sm">{investor.address}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(investor.timestamp).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <p className="text-sm font-medium">{investor.amount.toLocaleString()} XLM</p>
            </div>
          ))}
          {invoice.investors.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No investors yet</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Invoice Document</h2>
        </CardHeader>
        <CardContent>
          <DocumentPreview documentUrl={invoice.document_url} />
        </CardContent>
      </Card>
    </div>
  );
}
