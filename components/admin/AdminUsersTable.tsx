"use client";

/**
 * Admin User Management Table (#305, #451)
 *
 * Searchable, paginated table of platform users for admins:
 *  - wallet, email, KYC status, accreditation tier, and join date columns,
 *  - search filtering by wallet address or email,
 *  - manual KYC approve/reject with a required reason,
 *  - flag/unflag an account for review,
 *  - KYC history modal listing every submission, newest first,
 *  - per-user role dropdown with a save confirmation modal,
 *  - suspend/unsuspend actions with a confirmation modal,
 *  - suspended and flagged users shown with a distinct visual treatment.
 *
 * The table reads through `fetchAdminUsersExtended`, which normalises the
 * optional KYC fields the backend may omit. Older backends that only return
 * wallet/role/suspended still render: the extra columns fall back to sensible
 * defaults rather than blanking the table.
 */

import { useMemo, useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  fetchAdminUsers,
  normalizeAdminUsersExtendedResponse,
  fetchKycHistory,
  updateAdminUserRole,
  updateUserKycStatus,
  suspendAdminUser,
  unsuspendAdminUser,
  flagUser,
  unflagUser,
  type AdminUserRowExtended,
  type AdminUserRole,
  type KycStatus,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Flag, History, CheckCircle2, XCircle } from "lucide-react";

const ROLES: AdminUserRole[] = ["user", "seller", "admin"];

const KYC_STATUS_LABELS: Record<KycStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  flagged: "Flagged",
  not_submitted: "Not Submitted",
};

const ACCREDITATION_LABELS: Record<AdminUserRowExtended["accreditation_tier"], string> = {
  unaccredited: "Unaccredited",
  accredited: "Accredited",
  qualified: "Qualified",
};

function shortenWallet(wallet: string): string {
  if (wallet.length <= 12) return wallet;
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

function KycStatusBadge({ status }: { status: KycStatus }) {
  const variant =
    status === "approved"
      ? "default"
      : status === "rejected"
        ? "destructive"
        : status === "flagged"
          ? "destructive"
          : status === "pending"
            ? "secondary"
            : "outline";

  return (
    <Badge variant={variant} data-testid={`user-kyc-status-${status}`}>
      {KYC_STATUS_LABELS[status]}
    </Badge>
  );
}

/** Reason dialog shared by the approve, reject, and flag actions. */
type DecisionKind = "approve" | "reject" | "flag" | "unflag";

const DECISION_COPY: Record<
  DecisionKind,
  { title: string; confirm: string; destructive: boolean; reasonRequired: boolean }
> = {
  approve: {
    title: "Approve KYC",
    confirm: "Approve",
    destructive: false,
    reasonRequired: false,
  },
  reject: {
    title: "Reject KYC",
    confirm: "Reject",
    destructive: true,
    reasonRequired: true,
  },
  flag: {
    title: "Flag account for review",
    confirm: "Flag",
    destructive: true,
    reasonRequired: true,
  },
  unflag: {
    title: "Remove review flag",
    confirm: "Unflag",
    destructive: false,
    reasonRequired: false,
  },
};

function KycHistoryModal({
  user,
  onClose,
  token,
}: {
  user: AdminUserRowExtended;
  onClose: () => void;
  token?: string;
}) {
  const historyQuery = useQuery({
    queryKey: ["admin-kyc-history", user.wallet],
    queryFn: () => fetchKycHistory(user.wallet, undefined, token),
    enabled: Boolean(user.wallet),
    staleTime: 30 * 1000,
  });

  // Newest submission first. Guarded against an unparseable date so one bad
  // timestamp can't reorder the whole list into NaN comparisons.
  const entries = useMemo(() => {
    const list = historyQuery.data?.history ?? [];
    return [...list].sort((a, b) => {
      const aTime = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
      const bTime = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
      if (Number.isNaN(aTime) || Number.isNaN(bTime)) return 0;
      return bTime - aTime;
    });
  }, [historyQuery.data]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      data-testid="kyc-history-backdrop"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`KYC history for ${shortenWallet(user.wallet)}`}
        data-testid="kyc-history-modal"
        className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-lg border border-border bg-background p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">KYC History</h3>
            <p className="text-sm text-muted-foreground font-mono">
              {user.wallet}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} data-testid="kyc-history-close">
            Close
          </Button>
        </div>

        {historyQuery.isLoading ? (
          <div className="space-y-2" data-testid="kyc-history-loading">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : historyQuery.isError ? (
          <p className="py-6 text-center text-sm text-destructive" data-testid="kyc-history-error">
            Failed to load KYC history.
          </p>
        ) : entries.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground" data-testid="kyc-history-empty">
            No KYC submissions recorded.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" data-testid="kyc-history-table">
              <thead className="border-b bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="p-3 font-medium">Submitted</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Reviewed</th>
                  <th className="p-3 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {entries.map((entry, index) => (
                  <tr key={entry.id} data-testid={`kyc-history-entry-${entry.id}`}>
                    <td className="p-3 whitespace-nowrap">
                      {entry.submitted_at
                        ? new Date(entry.submitted_at).toLocaleString()
                        : "—"}
                    </td>
                    <td className="p-3">
                      <KycStatusBadge status={entry.status} />
                    </td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">
                      {entry.reviewed_at ? new Date(entry.reviewed_at).toLocaleString() : "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {entry.rejection_reason ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminUsersTable() {
  usePageTitle("Admin User Management");
  const { jwt } = useAuth();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleChange, setRoleChange] = useState<{
    user: AdminUserRowExtended;
    role: AdminUserRole;
  } | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<AdminUserRowExtended | null>(null);
  const [decision, setDecision] = useState<{
    kind: DecisionKind;
    user: AdminUserRowExtended;
  } | null>(null);
  const [reason, setReason] = useState("");
  const [historyUser, setHistoryUser] = useState<AdminUserRowExtended | null>(null);

  const usersQuery = useInfiniteQuery({
    queryKey: ["admin-users", search],
    queryFn: ({ pageParam }) =>
      fetchAdminUsers(search, pageParam as string | undefined, jwt ?? undefined).then(
        normalizeAdminUsersExtendedResponse
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.next_cursor ?? undefined : undefined,
    staleTime: 30 * 1000,
  });

  const users = useMemo(
    () => usersQuery.data?.pages.flatMap((page) => page.users) ?? [],
    [usersQuery.data]
  );

  const invalidateUsers = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });

  const roleMutation = useMutation({
    mutationFn: ({ wallet, role }: { wallet: string; role: AdminUserRole }) =>
      updateAdminUserRole(wallet, role, jwt ?? undefined),
    onSuccess: (_data, variables) => {
      toast.success(`Role updated to ${variables.role}`);
      setRoleChange(null);
      void invalidateUsers();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const suspendMutation = useMutation({
    mutationFn: ({ wallet, suspended }: { wallet: string; suspended: boolean }) =>
      suspended
        ? suspendAdminUser(wallet, jwt ?? undefined)
        : unsuspendAdminUser(wallet, jwt ?? undefined),
    onSuccess: (_data, variables) => {
      toast.success(variables.suspended ? "User suspended" : "User unsuspended");
      setSuspendTarget(null);
      void invalidateUsers();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const kycMutation = useMutation({
    mutationFn: ({
      wallet,
      status,
      reason,
    }: {
      wallet: string;
      status: KycStatus;
      reason?: string;
    }) => updateUserKycStatus(wallet, status, reason, jwt ?? undefined),
    onSuccess: (_data, variables) => {
      toast.success(`KYC status set to ${KYC_STATUS_LABELS[variables.status]}`);
      setDecision(null);
      setReason("");
      void invalidateUsers();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const flagMutation = useMutation({
    mutationFn: ({ wallet, flag, why }: { wallet: string; flag: boolean; why?: string }) =>
      flag
        ? flagUser(wallet, why ?? "", jwt ?? undefined)
        : unflagUser(wallet, jwt ?? undefined),
    onSuccess: (_data, variables) => {
      toast.success(
        variables.flag ? "Account flagged for review" : "Review flag removed"
      );
      setDecision(null);
      setReason("");
      void invalidateUsers();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function applySearch() {
    setSearch(searchInput.trim());
  }

  function openDecision(kind: DecisionKind, user: AdminUserRowExtended) {
    setReason("");
    setDecision({ kind, user });
  }

  function submitDecision() {
    if (!decision) return;
    const copy = DECISION_COPY[decision.kind];
    if (copy.reasonRequired && reason.trim().length === 0) {
      toast.error("A reason is required for this action.");
      return;
    }
    const trimmed = reason.trim();

    switch (decision.kind) {
      case "approve":
        kycMutation.mutate({
          wallet: decision.user.wallet,
          status: "approved",
          reason: trimmed || undefined,
        });
        break;
      case "reject":
        kycMutation.mutate({
          wallet: decision.user.wallet,
          status: "rejected",
          reason: trimmed,
        });
        break;
      case "flag":
        flagMutation.mutate({ wallet: decision.user.wallet, flag: true, why: trimmed });
        break;
      case "unflag":
        flagMutation.mutate({ wallet: decision.user.wallet, flag: false });
        break;
    }
  }

  const decisionPending = kycMutation.isPending || flagMutation.isPending;
  const decisionCopy = decision ? DECISION_COPY[decision.kind] : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold">Platform Users</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex gap-2"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              applySearch();
            }}
          >
            <Input
              placeholder="Search by wallet address or email"
              aria-label="Search by wallet address or email"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              data-testid="user-search-input"
            />
            <Button type="submit" variant="outline" data-testid="user-search-button">
              Search
            </Button>
          </form>

          {usersQuery.isLoading ? (
            <div className="space-y-2" data-testid="users-loading">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : users.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground" data-testid="empty-users">
              No users found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm" data-testid="admin-users-table">
                <thead className="border-b bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="p-3 font-medium">Wallet</th>
                    <th className="p-3 font-medium">Email</th>
                    <th className="p-3 font-medium">KYC Status</th>
                    <th className="p-3 font-medium">Accreditation</th>
                    <th className="p-3 font-medium">Role</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Joined</th>
                    <th className="p-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((user) => {
                    const isFlagged = user.flagged || user.kyc_status === "flagged";
                    return (
                      <tr
                        key={user.wallet}
                        className={
                          user.suspended
                            ? "bg-destructive/5"
                            : isFlagged
                              ? "bg-amber-500/5"
                              : undefined
                        }
                        data-testid={`user-row-${user.wallet}`}
                        data-suspended={user.suspended ? "true" : "false"}
                        data-kyc-status={user.kyc_status}
                        data-flagged={isFlagged ? "true" : "false"}
                      >
                        <td className="p-3 font-mono text-xs">{shortenWallet(user.wallet)}</td>
                        <td className="p-3 text-muted-foreground" data-testid={`user-email-${user.wallet}`}>
                          {user.email || "—"}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <KycStatusBadge status={user.kyc_status} />
                            {isFlagged && (
                              <Flag
                                className="size-3.5 text-amber-600"
                                aria-label="Flagged for review"
                              />
                            )}
                          </div>
                          {user.flag_reason && (
                            <p className="mt-1 max-w-[16rem] text-xs text-muted-foreground">
                              {user.flag_reason}
                            </p>
                          )}
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-xs">
                            {ACCREDITATION_LABELS[user.accreditation_tier] ?? user.accreditation_tier}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Select
                            value={user.role}
                            onValueChange={(value) =>
                              setRoleChange({ user, role: value as AdminUserRole })
                            }
                          >
                            <SelectTrigger
                              className="w-28"
                              aria-label={`Role for ${shortenWallet(user.wallet)}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map((role) => (
                                <SelectItem key={role} value={role}>
                                  {role}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3">
                          {user.suspended ? (
                            <Badge variant="destructive" data-testid="user-status-suspended">
                              Suspended
                            </Badge>
                          ) : (
                            <Badge variant="secondary" data-testid="user-status-active">
                              Active
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground whitespace-nowrap">
                          {new Date(user.joined_at).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setHistoryUser(user)}
                              data-testid={`user-kyc-history-${user.wallet}`}
                              aria-label={`View KYC history for ${shortenWallet(user.wallet)}`}
                            >
                              <History className="mr-1 size-3.5" />
                              History
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDecision("approve", user)}
                              disabled={user.kyc_status === "approved"}
                              data-testid={`user-kyc-approve-${user.wallet}`}
                            >
                              <CheckCircle2 className="mr-1 size-3.5" />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDecision("reject", user)}
                              disabled={user.kyc_status === "rejected"}
                              data-testid={`user-kyc-reject-${user.wallet}`}
                            >
                              <XCircle className="mr-1 size-3.5" />
                              Reject
                            </Button>
                            <Button
                              variant={isFlagged ? "outline" : "destructive"}
                              size="sm"
                              onClick={() => openDecision(isFlagged ? "unflag" : "flag", user)}
                              data-testid={`user-flag-toggle-${user.wallet}`}
                            >
                              <Flag className="mr-1 size-3.5" />
                              {isFlagged ? "Unflag" : "Flag"}
                            </Button>
                            <Button
                              variant={user.suspended ? "outline" : "destructive"}
                              size="sm"
                              onClick={() => setSuspendTarget(user)}
                              data-testid={`user-suspend-toggle-${user.wallet}`}
                            >
                              {user.suspended ? "Unsuspend" : "Suspend"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {usersQuery.hasNextPage && (
            <div className="text-center">
              <Button
                variant="outline"
                onClick={() => void usersQuery.fetchNextPage()}
                disabled={usersQuery.isFetchingNextPage}
                data-testid="users-load-more"
              >
                {usersQuery.isFetchingNextPage ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role change confirmation modal */}
      {roleChange && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          data-testid="role-confirm-backdrop"
          onClick={() => setRoleChange(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirm role change"
            data-testid="role-confirm-modal"
            className="mx-4 w-full max-w-sm rounded-lg border border-border bg-background p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="mb-2 text-lg font-bold">Change user role</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Set the role of{" "}
              <span className="font-mono">{shortenWallet(roleChange.user.wallet)}</span> to{" "}
              <span className="font-semibold">{roleChange.role}</span>?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setRoleChange(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  roleMutation.mutate({
                    wallet: roleChange.user.wallet,
                    role: roleChange.role,
                  })
                }
                disabled={roleMutation.isPending}
                data-testid="role-confirm-save"
              >
                {roleMutation.isPending ? "Saving..." : "Save role"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend/unsuspend confirmation modal */}
      {suspendTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          data-testid="suspend-confirm-backdrop"
          onClick={() => setSuspendTarget(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={suspendTarget.suspended ? "Confirm unsuspend" : "Confirm suspend"}
            data-testid="suspend-confirm-modal"
            className="mx-4 w-full max-w-sm rounded-lg border border-border bg-background p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="mb-2 text-lg font-bold">
              {suspendTarget.suspended ? "Unsuspend user" : "Suspend user"}
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {suspendTarget.suspended ? "Restore access for" : "Suspend"}{" "}
              <span className="font-mono">{shortenWallet(suspendTarget.wallet)}</span>?
              {suspendTarget.suspended
                ? null
                : " A suspended user cannot sign in or transact."}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSuspendTarget(null)}>
                Cancel
              </Button>
              <Button
                variant={suspendTarget.suspended ? "default" : "destructive"}
                size="sm"
                onClick={() =>
                  suspendMutation.mutate({
                    wallet: suspendTarget.wallet,
                    suspended: suspendTarget.suspended,
                  })
                }
                disabled={suspendMutation.isPending}
                data-testid="suspend-confirm-action"
              >
                {suspendMutation.isPending
                  ? "Working..."
                  : suspendTarget.suspended
                    ? "Unsuspend"
                    : "Suspend"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* KYC approve / reject / flag modal */}
      {decision && decisionCopy && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          data-testid="kyc-decision-backdrop"
          onClick={() => setDecision(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={decisionCopy.title}
            data-testid="kyc-decision-modal"
            className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="mb-2 text-lg font-bold">{decisionCopy.title}</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {decision.kind === "unflag" ? (
                <>
                  Remove the review flag from{" "}
                  <span className="font-mono">{shortenWallet(decision.user.wallet)}</span>?
                </>
              ) : (
                <>
                  {decisionCopy.title} for{" "}
                  <span className="font-mono">{shortenWallet(decision.user.wallet)}</span>?
                  {decision.user.email && ` (${decision.user.email})`}
                </>
              )}
            </p>

            {(decision.kind === "approve" || decision.kind === "reject") && (
              <div className="mb-4 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                Current status: <strong>{KYC_STATUS_LABELS[decision.user.kyc_status]}</strong>
              </div>
            )}

            {decision.kind === "reject" && (
              <p className="mb-2 text-sm text-muted-foreground">
                The user will be asked to resubmit. This reason is recorded in the KYC history.
              </p>
            )}
            {decision.kind === "flag" && (
              <p className="mb-2 text-sm text-muted-foreground">
                Flagging marks the account for manual review. The user is not blocked.
              </p>
            )}

            {decision.kind !== "unflag" && (
              <div className="mb-4 space-y-1.5">
                <label
                  htmlFor="kyc-decision-reason"
                  className="text-sm font-medium"
                >
                  Reason{decisionCopy.reasonRequired ? "" : " (optional)"}
                </label>
                <Textarea
                  id="kyc-decision-reason"
                  rows={3}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder={
                    decision.kind === "reject"
                      ? "Explain why the submission was rejected…"
                      : decision.kind === "flag"
                        ? "Explain what triggered the review…"
                        : "Add an internal note…"
                  }
                  data-testid="kyc-decision-reason"
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDecision(null)}
                disabled={decisionPending}
              >
                Cancel
              </Button>
              <Button
                variant={decisionCopy.destructive ? "destructive" : "default"}
                size="sm"
                onClick={submitDecision}
                disabled={decisionPending}
                data-testid="kyc-decision-confirm"
              >
                {decisionPending ? "Working..." : decisionCopy.confirm}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* KYC history modal */}
      {historyUser && (
        <KycHistoryModal
          user={historyUser}
          token={jwt ?? undefined}
          onClose={() => setHistoryUser(null)}
        />
      )}
    </div>
  );
}
