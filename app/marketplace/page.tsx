"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchInvoices, type Invoice } from "@/lib/api";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarketplaceFilterBar } from "@/components/marketplace";
import { AddToCompareButton } from "@/components/compare/AddToCompareButton";
import { CompareBar } from "@/components/compare/CompareBar";
import { Loader2, ArrowUp, ArrowDown } from "lucide-react";

type SortField = "amount" | "due_date" | null;
type SortDirection = "asc" | "desc";

function SortHeader({
  label,
  field,
  activeField,
  activeDirection,
  onSort,
}: {
  label: string;
  field: SortField;
  activeField: SortField;
  activeDirection: SortDirection;
  onSort: (field: SortField) => void;
}) {
  const isActive = activeField === field;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className="inline-flex items-center gap-1 text-sm font-medium hover:text-foreground transition-colors"
      data-testid={`sort-${field}`}
    >
      {label}
      {isActive && activeDirection === "asc" && <ArrowUp className="size-3" />}
      {isActive && activeDirection === "desc" && <ArrowDown className="size-3" />}
    </button>
  );
}

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{invoice.title}</h3>
          <Badge variant={invoice.status === "open" ? "default" : "secondary"}>
            {invoice.status}
          </Badge>
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
        <div className="mt-3 flex justify-end">
          <AddToCompareButton invoice={invoice} />
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
  usePageTitle("Browse Invoices");
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
  } = useInfiniteQuery({
    queryKey: ["invoices"],
    queryFn: ({ pageParam }) => fetchInvoices(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.next_cursor ?? undefined : undefined,
    staleTime: 60 * 1000,
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

  const allInvoices = useMemo(
    () => data?.pages.flatMap((p) => p.invoices) ?? [],
    [data]
  );

  const [status, setStatus] = useState<"open" | "funded" | "settled" | "all">("all");
  const [search, setSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  }, []);

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        if (sortDirection === "asc") {
          setSortDirection("desc");
        } else {
          setSortField(null);
          setSortDirection("asc");
        }
      } else {
        setSortField(field);
        setSortDirection("asc");
      }
    },
    [sortField, sortDirection]
  );

  const handleClear = useCallback(() => {
    setStatus("all");
    setSearch("");
    setDebouncedSearch("");
    setSortField(null);
    setSortDirection("asc");
  }, []);

  const filtered = useMemo(() => {
    let result = allInvoices.filter((inv) => {
      const matchesStatus = status === "all" || inv.status === status;
      const matchesSearch =
        debouncedSearch === "" ||
        inv.title.toLowerCase().includes(debouncedSearch.toLowerCase());
      return matchesStatus && matchesSearch;
    });

    if (sortField) {
      result = [...result].sort((a, b) => {
        let comparison: number;
        if (sortField === "amount") {
          comparison = a.amount - b.amount;
        } else {
          comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [allInvoices, status, debouncedSearch, sortField, sortDirection]);

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

      <MarketplaceFilterBar
        status={status}
        search={search}
        onStatusChange={setStatus}
        onSearchChange={handleSearchChange}
        onClear={handleClear}
      />

      {isFetching && !isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground my-4">
          <Loader2 className="size-3 animate-spin" />
          Refreshing…
        </div>
      )}

      <div className="flex items-center gap-6 mb-4 mt-4 text-sm text-muted-foreground">
        <SortHeader
          label="Face Value"
          field="amount"
          activeField={sortField}
          activeDirection={sortDirection}
          onSort={handleSort}
        />
        <SortHeader
          label="Deadline"
          field="due_date"
          activeField={sortField}
          activeDirection={sortDirection}
          onSort={handleSort}
        />
      </div>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            No invoices match your filters.
          </p>
        ) : (
          filtered.map((invoice) => (
            <InvoiceRow key={invoice.id} invoice={invoice} />
          ))
        )}
        {isFetchingNextPage &&
          Array.from({ length: 3 }).map((_, i) => (
            <SkeletonRow key={`skeleton-${i}`} />
          ))}
        {hasNextPage && <div ref={sentinelRefCallback} className="h-4" />}
        {!hasNextPage && filtered.length > 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">
            No more invoices
          </p>
        )}
      </div>

      <CompareBar />
    </main>
  );
}
