"use client";

import { useRef, useCallback, useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchInvoices, type Invoice } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WatchlistButton } from "@/components/marketplace/WatchlistButton";

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{invoice.title}</h3>
          <div className="flex items-center gap-2">
            <Badge variant={invoice.status === "open" ? "default" : "secondary"}>
              {invoice.status}
            </Badge>
            <WatchlistButton invoiceId={invoice.id} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
          <div>
            <span className="block text-foreground font-medium">
              {invoice.amount.toLocaleString()} XLM
            </span>
            Amount
          </div>
          <div>
            <span className="block text-foreground font-medium">
              {invoice.investor_count}
            </span>
            Investors
          </div>
          <div>
            <span className="block text-foreground font-medium">
              {new Date(invoice.due_date).toLocaleDateString()}
            </span>
            Due Date
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonRow() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-16" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Skeleton className="h-4 w-20 mb-1" />
            <Skeleton className="h-3 w-12" />
          </div>
          <div>
            <Skeleton className="h-4 w-8 mb-1" />
            <Skeleton className="h-3 w-14" />
          </div>
          <div>
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MarketplacePage() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["invoices"],
    queryFn: ({ pageParam }) => fetchInvoices(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.next_cursor ?? undefined : undefined,
  });

  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
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
      (sentinelRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    },
    [observer]
  );

  const invoices = useMemo(
    () => data?.pages.flatMap((p) => p.invoices) ?? [],
    [data]
  );

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Invoice Marketplace</h1>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Invoice Marketplace</h1>
      <div className="space-y-4">
        {invoices.map((invoice) => (
          <InvoiceRow key={invoice.id} invoice={invoice} />
        ))}
        {isFetchingNextPage &&
          Array.from({ length: 3 }).map((_, i) => (
            <SkeletonRow key={`skeleton-${i}`} />
          ))}
        {hasNextPage && <div ref={sentinelRefCallback} className="h-4" />}
        {!hasNextPage && invoices.length > 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">
            No more invoices
          </p>
        )}
      </div>
    </main>
  );
}