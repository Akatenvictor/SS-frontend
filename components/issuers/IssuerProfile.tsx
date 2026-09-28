"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useIssuerProfile } from "@/hooks/useIssuerProfile";
import { usePageTitle } from "@/hooks/usePageTitle";
import { formatMemberSince, type IssuerInvoice } from "@/lib/issuers";
import { KycStatusNotice, VerifiedBadge } from "./VerifiedBadge";
import { IssuerScoreCard, TotalFunded } from "./IssuerScoreCard";
import { InvoiceHistoryTable } from "./InvoiceHistoryTable";
import { ActiveInvoices } from "./ActiveInvoices";

function IssuerProfileSkeleton() {
  return (
    <div className="space-y-6" data-testid="issuer-profile-loading">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="mt-2 h-4 w-64" />
        </CardHeader>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

interface IssuerProfileProps {
  issuerId: string;
  /** Injected so date-dependent sections are deterministic under test. */
  now?: Date;
}

export function IssuerProfile({ issuerId, now }: IssuerProfileProps) {
  const { data: issuer, isLoading, isNotFound } = useIssuerProfile(issuerId);

  usePageTitle(issuer ? `${issuer.name} — Issuer profile` : null);

  if (isNotFound) {
    return (
      <div
        data-testid="issuer-not-found"
        className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center"
      >
        <h1 className="text-2xl font-bold">Issuer not found</h1>
        <p className="text-muted-foreground">
          We could not find an issuer with the id{" "}
          <span className="font-mono">{issuerId}</span>. It may have been removed.
        </p>
      </div>
    );
  }

  if (isLoading || !issuer) {
    return <IssuerProfileSkeleton />;
  }

  const invoices: IssuerInvoice[] = issuer.invoices ?? [];

  return (
    <div className="space-y-6" data-testid="issuer-profile">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold" data-testid="issuer-name">
              {issuer.name}
            </h1>
            <VerifiedBadge issuer={issuer} />
            <KycStatusNotice issuer={issuer} />
          </div>
          <p className="text-sm text-muted-foreground">
            <span data-testid="issuer-member-since">
              Member since {formatMemberSince(issuer.member_since)}
            </span>
          </p>
        </CardHeader>
        <CardContent>
          <TotalFunded totalFunded={issuer.total_funded} />
        </CardContent>
      </Card>

      <IssuerScoreCard invoices={invoices} />

      <ActiveInvoices invoices={invoices} now={now} />

      <InvoiceHistoryTable invoices={invoices} />
    </div>
  );
}
