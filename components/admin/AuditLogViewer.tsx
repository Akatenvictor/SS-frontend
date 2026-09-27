"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchAuditLog, type AuditLogEntry } from "@/lib/api";
import { truncateAddress } from "@/lib/stellar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

const ACTION_TYPE_FILTERS = [
  { value: "all", label: "All actions" },
  { value: "invoice_approve", label: "Invoice Approve" },
  { value: "invoice_reject", label: "Invoice Reject" },
  { value: "key_whitelist_update", label: "Whitelist Update" },
  { value: "supply_cap_update", label: "Supply Cap Update" },
] as const;

function formatCreatedAt(createdAt: string): { relative: string; absolute: string } {
  const date = new Date(createdAt);
  return {
    relative: Number.isNaN(date.getTime())
      ? "—"
      : formatDistanceToNow(date, { addSuffix: true }),
    absolute: Number.isNaN(date.getTime()) ? "" : date.toLocaleString(),
  };
}

export function AuditLogViewer() {
  const { jwt } = useAuth();
  const [actionType, setActionType] = useState<string>("all");
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

  const filterParam = actionType === "all" ? undefined : actionType;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["admin-audit-log", filterParam, jwt],
    queryFn: ({ pageParam }) =>
      fetchAuditLog(pageParam as string | undefined, filterParam, jwt ?? undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.next_cursor ?? undefined : undefined,
    enabled: Boolean(jwt),
  });

  const entries = useMemo(
    () => data?.pages.flatMap((page) => page.entries) ?? [],
    [data]
  );

  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleIntersect = useCallback(
    (observerEntries: IntersectionObserverEntry[]) => {
      if (observerEntries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  const observer = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new IntersectionObserver(handleIntersect, { rootMargin: "200px" });
  }, [handleIntersect]);

  const sentinelRefCallback = useCallback(
    (node: HTMLDivElement | null) => {
      if (observer) {
        if (sentinelRef.current) observer.unobserve(sentinelRef.current);
        if (node) observer.observe(node);
      }
      sentinelRef.current = node;
    },
    [observer]
  );

  return (
    <div className="space-y-4" data-testid="audit-log-viewer">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Audit Log</h2>
        <Select value={actionType} onValueChange={setActionType}>
          <SelectTrigger className="w-56" data-testid="audit-log-action-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTION_TYPE_FILTERS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent
            className="py-10 text-center text-sm text-muted-foreground"
            data-testid="audit-log-empty"
          >
            No audit log entries found.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Actor</th>
                <th className="px-4 py-2 font-medium">Action</th>
                <th className="px-4 py-2 font-medium">Target</th>
                <th className="px-4 py-2 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const { relative, absolute } = formatCreatedAt(entry.createdAt);
                return (
                  <tr
                    key={entry.id}
                    className="cursor-pointer border-t hover:bg-accent"
                    onClick={() => setSelectedEntry(entry)}
                    data-testid={`audit-log-row-${entry.id}`}
                  >
                    <td className="px-4 py-2 font-mono">
                      {truncateAddress(entry.actorWallet)}
                    </td>
                    <td className="px-4 py-2">{entry.actionType}</td>
                    <td className="px-4 py-2 font-mono">{entry.targetId}</td>
                    <td className="px-4 py-2 text-muted-foreground" title={absolute}>
                      {relative}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div ref={sentinelRefCallback} data-testid="audit-log-sentinel" />

      {isFetchingNextPage && (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {selectedEntry && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          data-testid="audit-log-detail-drawer"
        >
          <Card className="h-full w-full max-w-md overflow-y-auto rounded-none">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-lg font-semibold">Audit Entry</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedEntry(null)}
                  aria-label="Close audit entry detail"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-xs">
                {JSON.stringify(selectedEntry.payload, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
