"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  fetchPendingInvoices,
  approveInvoice,
  rejectInvoice,
  type PendingInvoice,
} from "@/lib/api";

export const ADMIN_PENDING_INVOICES_QUERY_KEY = ["admin", "pending-invoices"] as const;

interface AdminInvoiceReviewProps {
  isAdmin?: boolean;
}

export function AdminInvoiceReview({ isAdmin: propIsAdmin }: AdminInvoiceReviewProps) {
  const router = useRouter();
  const { address } = useAuth();
  const queryClient = useQueryClient();

  const [rejectingInvoiceId, setRejectingInvoiceId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [removedIds, setRemovedIds] = useState<string[]>([]);

  // Determine admin authorization status
  // If propIsAdmin is explicitly passed (e.g. in tests or parent), use it.
  // Otherwise, check if user is connected / authorised.
  const isAuthorised = propIsAdmin !== undefined ? propIsAdmin : Boolean(address);

  useEffect(() => {
    if (!isAuthorised) {
      toast.error("Not authorised");
      router.push("/");
    }
  }, [isAuthorised, router]);

  const {
    data: rawInvoices,
    isLoading,
    isError,
    error,
  } = useQuery<PendingInvoice[]>({
    queryKey: ADMIN_PENDING_INVOICES_QUERY_KEY,
    queryFn: fetchPendingInvoices,
    enabled: isAuthorised,
  });

  const invoices = rawInvoices ? rawInvoices.filter((inv) => !removedIds.includes(inv.id)) : [];

  useEffect(() => {
    if (isError && error) {
      const msg = (error as Error).message?.toLowerCase() || "";
      if (msg.includes("401") || msg.includes("403") || msg.includes("unauthorized") || msg.includes("not authorised")) {
        toast.error("Not authorised");
        router.push("/");
      }
    }
  }, [isError, error, router]);

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveInvoice(id),
    onSuccess: (_, id) => {
      toast.success("Invoice approved");
      setRemovedIds((prev) => [...prev, id]);
      queryClient.invalidateQueries({ queryKey: ADMIN_PENDING_INVOICES_QUERY_KEY });
    },
    onError: () => {
      toast.error("Failed to approve invoice");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectInvoice(id, reason),
    onSuccess: (_, { id }) => {
      toast.success("Invoice rejected");
      setRejectingInvoiceId(null);
      setRejectionReason("");
      setRemovedIds((prev) => [...prev, id]);
      queryClient.invalidateQueries({ queryKey: ADMIN_PENDING_INVOICES_QUERY_KEY });
    },
    onError: () => {
      toast.error("Failed to reject invoice");
    },
  });


  if (!isAuthorised) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="admin-review-loading">
        <h1 className="text-2xl font-bold">Pending Invoice Reviews</h1>
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

  if (!invoices || invoices.length === 0) {
    return (
      <div className="space-y-4" data-testid="admin-review-container">
        <h1 className="text-2xl font-bold">Pending Invoice Reviews</h1>
        <Card data-testid="empty-pending-invoices">
          <CardContent className="py-12 text-center text-muted-foreground">
            No invoices pending review
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="admin-review-container">
      <h1 className="text-2xl font-bold">Pending Invoice Reviews</h1>
      <div className="space-y-4">
        {invoices.map((invoice) => {
          const faceValue = invoice.face_value ?? (invoice as any).faceValue ?? (invoice as any).amount ?? 0;
          const submissionDate = invoice.submission_date ?? (invoice as any).submissionDate ?? (invoice as any).created_at ?? "";
          const isRejectingThis = rejectingInvoiceId === invoice.id;

          return (
            <Card key={invoice.id} data-testid={`pending-invoice-${invoice.id}`}>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <CardTitle className="text-lg">{invoice.title}</CardTitle>
                  <span className="font-semibold text-primary">{formatXLM(faceValue)}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <div>
                    Seller: <span className="font-mono text-foreground">{truncateAddress(invoice.seller)}</span>
                  </div>
                  <div>
                    Submitted: <span className="text-foreground">{submissionDate}</span>
                  </div>
                </div>

                {isRejectingThis ? (
                  <div className="space-y-3 pt-2 border-t">
                    <Input
                      placeholder="Reason for rejection..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      aria-label="Rejection reason"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setRejectingInvoiceId(null);
                          setRejectionReason("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={!rejectionReason.trim() || rejectMutation.isPending}
                        onClick={() => rejectMutation.mutate({ id: invoice.id, reason: rejectionReason.trim() })}
                      >
                        {rejectMutation.isPending ? "Rejecting..." : "Confirm Reject"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3 justify-end pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRejectingInvoiceId(invoice.id);
                        setRejectionReason("");
                      }}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      disabled={approveMutation.isPending}
                      onClick={() => approveMutation.mutate(invoice.id)}
                    >
                      {approveMutation.isPending ? "Approving..." : "Approve"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
