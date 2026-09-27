"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { formatXLM } from "@/lib/format";
import { truncateAddress } from "@/lib/stellar";
import {
  fetchSettlements,
  proposeSettlement,
  approveSettlement,
  type SettlementInvoiceRow,
} from "@/lib/api";

export const ADMIN_SETTLEMENTS_QUERY_KEY = ["admin", "settlements"] as const;

interface AdminSettlementsProps {
  isAdmin?: boolean;
}

/**
 * Two-of-two settlement multi-sig UI (issue #118): one admin proposes a
 * repayment amount for a funded invoice, a second (different) admin
 * approves it, which executes the settlement.
 */
export function AdminSettlements({ isAdmin: propIsAdmin }: AdminSettlementsProps) {
  const { address, jwt } = useAuth();
  const queryClient = useQueryClient();

  const [proposingId, setProposingId] = useState<string | null>(null);
  const [proposedAmount, setProposedAmount] = useState("");
  const [executedBanner, setExecutedBanner] = useState<string | null>(null);

  const isAuthorised = propIsAdmin !== undefined ? propIsAdmin : Boolean(address);

  const { data, isLoading } = useQuery({
    queryKey: ADMIN_SETTLEMENTS_QUERY_KEY,
    queryFn: () => fetchSettlements(undefined, jwt ?? undefined),
    enabled: isAuthorised,
  });

  const proposeMutation = useMutation({
    mutationFn: ({ invoiceId, amount }: { invoiceId: string; amount: number }) =>
      proposeSettlement(invoiceId, amount, jwt ?? undefined),
    onSuccess: () => {
      toast.success("Settlement proposed");
      setProposingId(null);
      setProposedAmount("");
      queryClient.invalidateQueries({ queryKey: ADMIN_SETTLEMENTS_QUERY_KEY });
    },
    onError: () => {
      toast.error("Failed to propose settlement");
    },
  });

  const approveMutation = useMutation({
    mutationFn: (invoiceId: string) => approveSettlement(invoiceId, jwt ?? undefined),
    onSuccess: (_, invoiceId) => {
      setExecutedBanner(invoiceId);
      queryClient.invalidateQueries({ queryKey: ADMIN_SETTLEMENTS_QUERY_KEY });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to approve settlement");
    },
  });

  if (!isAuthorised) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="admin-settlements-loading">
        <h1 className="text-2xl font-bold">Settlements</h1>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32 mt-1" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const invoices: SettlementInvoiceRow[] = data?.invoices ?? [];

  return (
    <div className="space-y-4" data-testid="admin-settlements-container">
      <h1 className="text-2xl font-bold">Settlements</h1>

      {executedBanner && (
        <div
          className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-900"
          data-testid="settlement-executed-banner"
        >
          Settlement executed
        </div>
      )}

      {invoices.length === 0 ? (
        <Card data-testid="empty-settlements">
          <CardContent className="py-12 text-center text-muted-foreground">
            No funded invoices awaiting settlement
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {invoices.map((row) => {
            const hasProposal = Boolean(row.proposal);
            const isOwnProposal =
              hasProposal && row.proposal?.proposed_by === address;
            const isProposingThis = proposingId === row.invoice_id;

            return (
              <Card key={row.invoice_id} data-testid={`settlement-row-${row.invoice_id}`}>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <CardTitle className="text-lg">{row.title}</CardTitle>
                    <span className="font-semibold text-primary">
                      {formatXLM(row.face_value)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Seller:{" "}
                    <span className="font-mono text-foreground">
                      {truncateAddress(row.seller)}
                    </span>
                  </div>

                  {hasProposal && (
                    <div
                      className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900"
                      data-testid={`pending-settlement-badge-${row.invoice_id}`}
                    >
                      Pending settlement — {formatXLM(row.proposal!.amount)}
                    </div>
                  )}

                  {isProposingThis ? (
                    <div className="space-y-3 pt-2 border-t">
                      <label
                        htmlFor={`settlement-amount-${row.invoice_id}`}
                        className="text-sm font-medium"
                      >
                        Repayment amount (XLM)
                      </label>
                      <Input
                        id={`settlement-amount-${row.invoice_id}`}
                        type="number"
                        min="0"
                        step="0.0000001"
                        value={proposedAmount}
                        onChange={(e) => setProposedAmount(e.target.value)}
                        aria-label="Repayment amount"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setProposingId(null);
                            setProposedAmount("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          disabled={
                            !proposedAmount.trim() ||
                            Number(proposedAmount) <= 0 ||
                            proposeMutation.isPending
                          }
                          onClick={() =>
                            proposeMutation.mutate({
                              invoiceId: row.invoice_id,
                              amount: Number(proposedAmount),
                            })
                          }
                        >
                          {proposeMutation.isPending ? "Proposing..." : "Submit Proposal"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3 justify-end pt-2 border-t">
                      {!hasProposal && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setProposingId(row.invoice_id);
                            setProposedAmount("");
                          }}
                          data-testid={`propose-settlement-${row.invoice_id}`}
                        >
                          Propose Settlement
                        </Button>
                      )}
                      {hasProposal && (
                        <Button
                          size="sm"
                          disabled={isOwnProposal || approveMutation.isPending}
                          onClick={() => approveMutation.mutate(row.invoice_id)}
                          data-testid={`approve-settlement-${row.invoice_id}`}
                          title={
                            isOwnProposal
                              ? "You cannot approve your own settlement proposal"
                              : undefined
                          }
                        >
                          {approveMutation.isPending
                            ? "Approving..."
                            : "Approve Settlement"}
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
