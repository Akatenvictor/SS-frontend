"use client";

/**
 * Admin User Management Table (#305)
 *
 * Searchable, paginated table of platform users for admins:
 *  - wallet, role, status, and join date columns,
 *  - search filtering by wallet address,
 *  - per-user role dropdown with a save confirmation modal,
 *  - suspend/unsuspend actions with a confirmation modal,
 *  - suspended users shown with a distinct visual treatment.
 */

import { useMemo, useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAdminUsers,
  updateAdminUserRole,
  suspendAdminUser,
  unsuspendAdminUser,
  type AdminUserRow,
  type AdminUserRole,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const ROLES: AdminUserRole[] = ["user", "seller", "admin"];

function shortenWallet(wallet: string): string {
  if (wallet.length <= 12) return wallet;
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

export function AdminUsersTable() {
  usePageTitle("Admin User Management");
  const { jwt } = useAuth();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleChange, setRoleChange] = useState<{ user: AdminUserRow; role: AdminUserRole } | null>(
    null
  );
  const [suspendTarget, setSuspendTarget] = useState<AdminUserRow | null>(null);

  const usersQuery = useInfiniteQuery({
    queryKey: ["admin-users", search],
    queryFn: ({ pageParam }) =>
      fetchAdminUsers(search, pageParam as string | undefined, jwt ?? undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.next_cursor ?? undefined : undefined,
    staleTime: 30 * 1000,
  });

  const users = useMemo(
    () => usersQuery.data?.pages.flatMap((page) => page.users) ?? [],
    [usersQuery.data]
  );

  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: ["admin-users"] });

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

  function applySearch() {
    setSearch(searchInput.trim());
  }

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
              placeholder="Search by wallet address"
              aria-label="Search by wallet address"
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
                    <th className="p-3 font-medium">Role</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Joined</th>
                    <th className="p-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((user) => (
                    <tr
                      key={user.wallet}
                      className={user.suspended ? "bg-destructive/5" : undefined}
                      data-testid={`user-row-${user.wallet}`}
                      data-suspended={user.suspended ? "true" : "false"}
                    >
                      <td className="p-3 font-mono text-xs">{shortenWallet(user.wallet)}</td>
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
                      <td className="p-3 text-muted-foreground">
                        {new Date(user.joined_at).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant={user.suspended ? "outline" : "destructive"}
                          size="sm"
                          onClick={() => setSuspendTarget(user)}
                          data-testid={`user-suspend-toggle-${user.wallet}`}
                        >
                          {user.suspended ? "Unsuspend" : "Suspend"}
                        </Button>
                      </td>
                    </tr>
                  ))}
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
    </div>
  );
}
