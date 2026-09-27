"use client";

/**
 * Admin Invoice Review (issue #280)
 *
 * Admin panel for reviewing submitted invoices with approve/reject actions
 * that trigger backend state transitions:
 *  - pending invoices listed with key metadata,
 *  - detail drawer on row click with the full invoice info and IPFS document,
 *  - confirmation modal before every approve/reject,
 *  - rejection reason required on reject,
 *  - optimistic UI updates with rollback on API error.
 */

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAdminInvoices,
  approveAdminInvoice,
  rejectAdminInvoice,
  AdminInvoiceRow,
} from "@/lib/api";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DocumentPreview } from "@/components/invoices/DocumentPreview";
import { toast } from "sonner";
import { FileText, CheckCircle, XCircle, ExternalLink, X, Eye } from "lucide-react";

interface ConfirmationState {
  invoiceId: string;
  action: "approve" | "reject";
}

export function AdminInvoicesReview() {
  usePageTitle("Admin Invoice Review");
  const { jwt } = useAuth();
  const queryClient = useQueryClient();

  const [selectedDocUrl, setSelectedDocUrl] = useState<string | null>(null);
  const [drawerInvoiceId, setDrawerInvoiceId] = useState<string | null>(null);
  const [rejectingInvoiceId, setRejectingInvoiceId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ["admin-invoices-pending", jwt],
    queryFn: ({ pageParam }) =>
      fetchAdminInvoices("pending", pageParam as string | undefined, jwt ?? undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.next_cursor ?? undefined : undefined,
    enabled: !!jwt,
  });

  const removeInvoiceFromCache = (invoiceId: string) => {
    queryClient.setQueryData(["admin-invoices-pending", jwt], (oldData: any) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => ({
          ...page,
          invoices: page.invoices.filter(
            (inv: AdminInvoiceRow) => inv.invoiceId !== invoiceId
          ),
        })),
      };
    });
  };

  /**
   * Approve (issue #280): the row is removed optimistically before the API
   * call completes; on error the previous page snapshot is rolled back.
   */
  const approveMutation = useMutation({
    mutationFn: (invoiceId: string) => approveAdminInvoice(invoiceId, jwt ?? undefined),

    onMutate: async (invoiceId) => {
      await queryClient.cancelQueries({ queryKey: ["admin-invoices-pending", jwt] });
      const previous = queryClient.getQueryData(["admin-invoices-pending", jwt]);
      removeInvoiceFromCache(invoiceId);
      return { previous };
    },

    onSuccess: (_, invoiceId) => {
      toast.success(`Invoice ${invoiceId.slice(0, 8)} approved — now active`);
    },

    onError: (err: any, _invoiceId, context) => {
      // Optimistic rollback: restore the removed row.
      if (context?.previous) {
        queryClient.setQueryData(["admin-invoices-pending", jwt], context.previous);
      }
      toast.error(err?.message || "Failed to approve invoice");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ invoiceId, reason }: { invoiceId: string; reason: string }) =>
      rejectAdminInvoice(invoiceId, reason, jwt ?? undefined),

    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["admin-invoices-pending", jwt] });
      const previous = queryClient.getQueryData(["admin-invoices-pending", jwt]);
      removeInvoiceFromCache(variables.invoiceId);
      return { previous };
    },

    onSuccess: (_, variables) => {
      toast.success("Invoice rejected successfully");
      setRejectingInvoiceId(null);
      setRejectionReason("");
    },

    onError: (err: any, _variables, context) => {
      // Optimistic rollback: restore the removed row.
      if (context?.previous) {
        queryClient.setQueryData(["admin-invoices-pending", jwt], context.previous);
      }
      toast.error(err?.message || "Failed to reject invoice");
    },
  });

  const allInvoices = data?.pages.flatMap((p) => p.invoices) ?? [];
  const drawerInvoice = allInvoices.find((inv) => inv.invoiceId === drawerInvoiceId) ?? null;

  const executeConfirmation = () => {
    if (!confirmation) return;
    if (confirmation.action === "approve") {
      approveMutation.mutate(confirmation.invoiceId);
    } else {
      const reason = rejectionReason.trim();
      if (!reason) return;
      rejectMutation.mutate({ invoiceId: confirmation.invoiceId, reason });
    }
    setConfirmation(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="admin-invoices-loading">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6 flex justify-between items-center">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-12 text-center text-red-500">
        Error loading pending invoices. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold">Pending Invoice Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          {allInvoices.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground" data-testid="empty-pending-invoices">
              No pending invoices to review.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm" data-testid="admin-invoices-table">
                <thead className="border-b bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="p-3 font-medium">Seller Name</th>
                    <th className="p-3 font-medium">Invoice ID</th>
                    <th className="p-3 font-medium">Face Value</th>
                    <th className="p-3 font-medium">Submitted At</th>
                    <th className="p-3 font-medium">Document</th>
                    <th className="p-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {allInvoices.map((inv) => (
                    <tr
                      key={inv.invoiceId}
                      className="cursor-pointer hover:bg-muted/30"
                      data-testid={`invoice-row-${inv.invoiceId}`}
                      onClick={() => setDrawerInvoiceId(inv.invoiceId)}
                    >
                      <td className="p-3 font-medium">{inv.sellerName}</td>
                      <td className="p-3 text-muted-foreground">{inv.invoiceId}</td>
                      <td className="p-3 font-semibold">{inv.faceValue.toLocaleString()} XLM</td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(inv.submittedAt).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDocUrl(inv.documentUrl || "/sample.pdf");
                          }}
                          data-testid={`view-doc-btn-${inv.invoiceId}`}
                        >
                          <FileText className="size-4 mr-1" />
                          View Document
                        </Button>
                      </td>
                      <td className="p-3 text-right">
                        {rejectingInvoiceId === inv.invoiceId ? (
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <Input
                              placeholder="Reason for rejection…"
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              className="h-8 w-48 text-xs"
                              data-testid={`reject-reason-input-${inv.invoiceId}`}
                            />
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={!rejectionReason.trim() || rejectMutation.isPending}
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmation({
                                  invoiceId: inv.invoiceId,
                                  action: "reject",
                                });
                              }}
                              data-testid={`confirm-reject-btn-${inv.invoiceId}`}
                            >
                              Confirm
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRejectingInvoiceId(null);
                                setRejectionReason("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div
                            className="flex items-center justify-end gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              disabled={approveMutation.isPending}
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmation({ invoiceId: inv.invoiceId, action: "approve" });
                              }}
                              data-testid={`approve-btn-${inv.invoiceId}`}
                            >
                              <CheckCircle className="size-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRejectingInvoiceId(inv.invoiceId);
                                setRejectionReason("");
                              }}
                              data-testid={`reject-btn-${inv.invoiceId}`}
                            >
                              <XCircle className="size-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {hasNextPage && (
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                data-testid="load-more-btn"
              >
                {isFetchingNextPage ? "Loading…" : "Load More"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail drawer (issue #280): opens on row click with full invoice
          info and the IPFS document. */}
      {drawerInvoice && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/50"
          data-testid="invoice-drawer-backdrop"
          onClick={() => setDrawerInvoiceId(null)}
        >
          <aside
            role="dialog"
            aria-label={`Invoice ${drawerInvoice.invoiceId} details`}
            data-testid="invoice-drawer"
            className="h-full w-full max-w-md overflow-y-auto border-l border-border bg-background p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">Invoice Details</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDrawerInvoiceId(null)}
                aria-label="Close drawer"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Invoice ID</dt>
                <dd className="font-mono">{drawerInvoice.invoiceId}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Seller</dt>
                <dd className="font-medium">{drawerInvoice.sellerName}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Face Value</dt>
                <dd className="font-semibold">
                  {drawerInvoice.faceValue.toLocaleString()} XLM
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Submitted</dt>
                <dd>{new Date(drawerInvoice.submittedAt).toLocaleString()}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="capitalize">{drawerInvoice.status}</dd>
              </div>
            </dl>

            {/* IPFS document (issue #280) */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">IPFS Document</p>
                {drawerInvoice.documentUrl && (
                  <a
                    href={drawerInvoice.documentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    data-testid="ipfs-link"
                  >
                    Open on IPFS <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <div className="rounded-lg border border-border p-3">
                <DocumentPreview documentUrl={drawerInvoice.documentUrl || "/sample.pdf"} />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setRejectingInvoiceId(drawerInvoice.invoiceId);
                  setRejectionReason("");
                }}
                data-testid="drawer-reject-btn"
              >
                <XCircle className="mr-1 h-4 w-4" />
                Reject
              </Button>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={approveMutation.isPending}
                onClick={() =>
                  setConfirmation({ invoiceId: drawerInvoice.invoiceId, action: "approve" })
                }
                data-testid="drawer-approve-btn"
              >
                <CheckCircle className="mr-1 h-4 w-4" />
                Approve
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Confirmation modal (issue #280) */}
      {confirmation && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          data-testid="confirm-action-modal"
        >
          <div className="w-full max-w-sm rounded-lg bg-card p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold">
              {confirmation.action === "approve" ? "Approve invoice?" : "Reject invoice?"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {confirmation.action === "approve"
                ? "This transitions the invoice to active so investors can fund it."
                : `This rejects the invoice${rejectionReason.trim() ? ` — reason: “${rejectionReason.trim()}”` : ""}.`}
            </p>
            {confirmation.action === "reject" && !rejectionReason.trim() && (
              <p className="text-xs text-red-500">
                A rejection reason is required before confirming.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmation(null)}>
                Cancel
              </Button>
              <Button
                variant={confirmation.action === "approve" ? "default" : "destructive"}
                size="sm"
                className={
                  confirmation.action === "approve"
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : undefined
                }
                disabled={
                  (confirmation.action === "reject" && !rejectionReason.trim()) ||
                  approveMutation.isPending ||
                  rejectMutation.isPending
                }
                onClick={executeConfirmation}
                data-testid="confirm-action-btn"
              >
                {approveMutation.isPending || rejectMutation.isPending
                  ? "Working…"
                  : confirmation.action === "approve"
                    ? "Confirm approve"
                    : "Confirm reject"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Document Modal */}
      {selectedDocUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          data-testid="document-modal"
        >
          <div className="w-full max-w-2xl rounded-lg bg-card p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Document Preview</h3>
              <Button variant="ghost" size="sm" onClick={() => setSelectedDocUrl(null)}>
                Close
              </Button>
            </div>
            <DocumentPreview documentUrl={selectedDocUrl} />
          </div>
        </div>
      )}
    </div>
  );
}
