"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileStatsSkeleton } from "@/components/ui/skeletons";
import { KycStatusBanner } from "@/components/dashboard/KycStatusBanner";
import { SellerInvoiceTabs } from "@/components/dashboard/SellerInvoiceTabs";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import {
  useSellerDashboard,
  useSellerKycStatus,
} from "@/hooks/useSellerDashboard";
import { useStellarWallet } from "@/hooks/useStellarWallet";

function formatXlm(amount: number): string {
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} XLM`;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function InvoiceRowSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-4 w-32 mt-1" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-3 w-full" />
      </CardContent>
    </Card>
  );
}

export function SellerDashboard() {
  const { data, isLoading } = useSellerDashboard();
  const { data: kycStatus } = useSellerKycStatus();
  const wallet = useStellarWallet();

  if (isLoading || !data) {
    return (
      <div className="space-y-6" data-testid="seller-dashboard-loading" aria-busy="true">
        <ProfileStatsSkeleton />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <InvoiceRowSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {kycStatus && (
        <KycStatusBanner
          status={kycStatus.status}
          reason={kycStatus.rejection_reason ?? kycStatus.reason}
        />
      )}

      <OnboardingChecklist
        walletConnected={wallet.isConnected}
        kycStatus={kycStatus?.status ?? null}
        invoiceCount={data.invoices.length}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Total Invoices"
          value={data.total_invoices.toString()}
        />
        <StatCard label="Total Funded" value={data.total_funded.toString()} />
        <StatCard label="Total Settled" value={data.total_settled.toString()} />
        <StatCard label="XLM Raised" value={formatXlm(data.total_raised)} />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Invoice Breakdown</h2>
        <SellerInvoiceTabs invoices={data.invoices} />
      </div>
    </div>
  );
}
