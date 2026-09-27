"use client";

/**
 * Admin invoice review queue (issue #384).
 *
 * Pending invoices table with approve / reject actions, rejection reason modal,
 * and approved / rejected history tabs. Route is admin-only.
 */

import { useState } from "react";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle, XCircle, FileText } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  fetchPendingInvoices,
  fetchReviewedInvoices,
  approveInvoice,
  rejectInvoice,
  type PendingInvoice,
  type ReviewedInvoice,
} from "@/lib/api";
import { formatXLM } from "@/lib/format";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type Tab = "pending" | "approved" | "rejected";

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}

function HistoryTab({ status, jwt }: { status: "approved" | "rejected"; jwt: string | null }) {
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["admin-reviewed-invoices", status, jwt],
      queryFn: ({ pageParam }) => fetchReviewedInvoices(status, pageParam as string | undefined, jwt ?? undefined),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (last) => (last.has_more ? last.next_cursor ?? undefined : undefined),
      enabled: !!jwt,
    });

  const invoices: ReviewedInvoice[] = data?.pages.flatMap((p) => p.invoices) ?? [];

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Loading…</div>;
  if (isError) return <div className="py-8 text-center text-destructive">Failed to load history.</div>;
  if (invoices.length === 0) return <p className="py-8 text-center text-muted-foreground" data-testid={`${status}-empty`}>No {status} invoices.</p>;

  return (
    <div className="space-y-2" data-testid={`${status}-history`}>
      {invoices.map((inv) => (
        <Card key={inv.id}>
          <CardContent className="pt-4 pb-4 flex items-center justify-between gap-4 text-sm">
            <div>
              <p className="font-medium">{inv.title}</p>
              <p className="text-muted-foreground text-xs">{formatXLM(inv.face_value)} · Reviewed {formatDate(inv.reviewed_at)}</p>
              {inv.rejection_reason && (
                <p className="text-xs text-destructive mt-1">Reason: {inv.rejection_reason}</p>
              )}
            </div>
            <Badge variant={status === "approved" ? "secondary" : "destructive"}>{status}</Badge>
          </CardContent>
        </Card>
      ))}
      {hasNextPage && (
        <div className="text-center mt-2">
          <Button variant="outline" size="sm" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? "Loading…" : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}

export function AdminInvoiceReviewQueue() {
  usePageTitle("Invoice Review Queue");
  const { jwt } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("pending");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: pendingInvoices, isLoading, isError } = useQuery<PendingInvoice[]>({
    queryKey: ["admin-pending-invoices", jwt],
    queryFn: () => fetchPendingInvoices(jwt ?? undefined),
    enabled: !!jwt,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveInvoice(id, jwt ?? undefined),
    onSuccess: (_, id) => {
      toast.success("Invoice approved — now live");
      queryClient.setQueryData<PendingInvoice[]>(["admin-pending-invoices", jwt], (prev) => prev?.filter((i) => i.id !== id) ?? []);
      queryClient.invalidateQueries({ queryKey: ["admin-reviewed-invoices", "approved"] });
    },
    onError: (err: any) => toast.error(err?.message ?? "Failed to approve"),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectInvoice(id, reason, jwt ?? undefined),
    onSuccess: (_, { id }) => {
      toast.success("Invoice rejected");
      setRejectingId(null);
      setRejectionReason("");
      queryClient.setQueryData<PendingInvoice[]>(["admin-pending-invoices", jwt], (prev) => prev?.filter((i) => i.id !== id) ?? []);
      queryClient.invalidateQueries({ queryKey: ["admin-reviewed-invoices", "rejected"] });
    },
    onError: (err: any) => toast.error(err?.message ?? "Failed to reject"),
  });

  const invoices = pendingInvoices ?? [];

  return (
    <div className="space-y-6">
      <div className="flex gap-6 border-b">
        <TabButton active={activeTab === "pending"} onClick={() => setActiveTab("pending")}>Pending</TabButton>
        <TabButton active={activeTab === "approved"} onClick={() => setActiveTab("approved")}>Approved</TabButton>
        <TabButton active={activeTab === "rejected"} onClick={() => setActiveTab("rejected")}>Rejected</TabButton>
      </div>

      {activeTab === "pending" && (
        <Card>
          <CardHeader><CardTitle>Pending Invoices</CardTitle></CardHeader>
          <CardContent>
            {isLoading && (
              <div className="space-y-3" data-testid="review-queue-loading">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            )}
            {isError && <p className="text-center text-destructive py-8">Failed to load pending invoices.</p>}
            {!isLoading && !isError && invoices.length === 0 && (
              <p className="py-8 text-center text-muted-foreground" data-testid="pending-empty">No pending invoices to review.</p>
            )}
            {!isLoading && invoices.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm" data-testid="pending-invoices-table">
                  <thead className="border-b bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="p-3 font-medium">Title</th>
                      <th className="p-3 font-medium">Issuer</th>
                      <th className="p-3 font-medium">Face Value</th>
                      <th className="p-3 font-medium">Submitted</th>
                      <th className="p-3 font-medium">Docs</th>
                      <th className="p-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {invoices.map((inv) => (
                      <tr key={inv.id} data-testid={`pending-row-${inv.id}`} className="hover:bg-muted/30">
                        <td className="p-3 font-medium">{inv.title}</td>
                        <td className="p-3 font-mono text-xs text-muted-foreground">{inv.seller.slice(0, 12)}…</td>
                        <td className="p-3 font-semibold">{formatXLM(inv.face_value)}</td>
                        <td className="p-3 text-muted-foreground">{formatDate(inv.submission_date)}</td>
                        <td className="p-3">
                          {inv.document_url
                            ? <a href={inv.document_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><FileText className="h-3 w-3" />View</a>
                            : <span className="text-xs text-muted-foreground">—</span>
                          }
                        </td>
                        <td className="p-3 text-right">
                          {rejectingId === inv.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <Input
                                placeholder="Rejection reason…"
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                className="h-8 w-44 text-xs"
                                data-testid={`reject-reason-${inv.id}`}
                              />
                              <Button size="sm" variant="destructive"
                                disabled={!rejectionReason.trim() || rejectMutation.isPending}
                                onClick={() => rejectMutation.mutate({ id: inv.id, reason: rejectionReason.trim() })}
                                data-testid={`confirm-reject-${inv.id}`}>
                                Confirm
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => { setRejectingId(null); setRejectionReason(""); }}>Cancel</Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white"
                                disabled={approveMutation.isPending}
                                onClick={() => approveMutation.mutate(inv.id)}
                                data-testid={`approve-btn-${inv.id}`}>
                                <CheckCircle className="h-4 w-4 mr-1" />Approve
                              </Button>
                              <Button size="sm" variant="destructive"
                                onClick={() => { setRejectingId(inv.id); setRejectionReason(""); }}
                                data-testid={`reject-btn-${inv.id}`}>
                                <XCircle className="h-4 w-4 mr-1" />Reject
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
          </CardContent>
        </Card>
      )}

      {activeTab === "approved" && <HistoryTab status="approved" jwt={jwt} />}
      {activeTab === "rejected" && <HistoryTab status="rejected" jwt={jwt} />}
    </div>
  );
}
