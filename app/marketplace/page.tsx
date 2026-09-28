"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchInvoices, resolveInvoiceCategory, type Invoice, type InvoiceCategory } from "@/lib/api";
import { usePageTitle } from "@/hooks/usePageTitle";
import { FundingProgressBar } from "@/components/invoices";
import { Skeleton } from "@/components/ui/skeleton";
import { InvoiceCardSkeleton } from "@/components/ui/skeletons";
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
        <div className="grid grid-cols-4 gap-4 text-sm text-muted-foreground">
          <div>
            <span className="block text-foreground font-medium">
              {invoice.amount.toLocaleString()} XLM
            </span>
            Amount
          </div>
          <div>
            <span className="block text-foreground font-medium">
              {invoice.yield_percentage !== undefined ? `${invoice.yield_percentage}%` : "N/A"}
            </span>
            Yield
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
        <div className="mt-4">
          <FundingProgressBar
            raised={invoice.raised}
            target={invoice.amount}
            investorCount={invoice.investor_count}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default function MarketplacePage() {
  usePageTitle("Browse Invoices");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Initialize filter state from URL search params
  const initialStatuses = useMemo(() => {
    const raw = searchParams.get("statuses");
    if (!raw) return [];
    return raw.split(",").filter((s) => ["open", "funded", "settled", "expired"].includes(s)) as FundingStatus[];
  }, [searchParams]);

  const initialMinYield = useMemo(() => {
    const raw = searchParams.get("minYield");
    return raw ? Number(raw) || 0 : 0;
  }, [searchParams]);

  const initialFromDate = searchParams.get("fromDate") || "";
  const initialToDate = searchParams.get("toDate") || "";
  const initialStatus = (searchParams.get("status") as "open" | "funded" | "settled" | "all") || "all";
  const initialSearch = searchParams.get("search") || "";

  const [panelFilters, setPanelFilters] = useState<MarketplaceFilterState>({
    statuses: initialStatuses,
    minYield: initialMinYield,
    fromDate: initialFromDate,
    toDate: initialToDate,
    minAmount: Number(searchParams.get("minAmount")) || 0,
    maxAmount: Number(searchParams.get("maxAmount")) || 0,
  });

  const [status, setStatus] = useState<"open" | "funded" | "settled" | "all">(initialStatus);
  const [search, setSearch] = useState(initialSearch);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [pageSize, setPageSize] = useState<PageSize>(() =>
    parsePageSize(searchParams.get("pageSize"))
  );

  // Category tab and named sort order for the discovery surface (#452). The
  // category is seeded from the URL so a filtered view is shareable.
  const [category, setCategory] = useState<InvoiceCategory>(() => {
    const raw = searchParams.get("category");
    return raw && ["all", "trade_finance", "real_estate", "sme"].includes(raw)
      ? (raw as InvoiceCategory)
      : "all";
  });

  /**
   * Named sort order, or `null` when the user hasn't chosen one.
   *
   * `null` means "keep the order the API returned", which is the default
   * view — the backend already sorts by recency and applying a client sort on
   * top would silently reorder rows the user did not ask to reorder. The
   * dropdown still displays "Newest" so the control never looks unset; it just
   * isn't *applied* until picked.
   */
  const [namedSort, setNamedSort] = useState<MarketplaceSort | null>(() => {
    const raw = searchParams.get("sort");
    return raw && (SORT_OPTIONS as readonly string[]).includes(raw)
      ? (raw as MarketplaceSort)
      : null;
  });

  // The cursor the list was scrolled to when the user navigated away, read once
  // on mount so a browser Back restores their position (Issue #365). Captured in
  // a ref rather than state: it seeds `initialPageParam` and must not change
  // afterwards, or the query would reset itself as the user pages on.
  const initialCursorRef = useRef<string | undefined>(
    searchParams.get("cursor") ?? undefined
  );

  // Sync state to URL params
  const updateUrlParams = useCallback(
    (newFilters: MarketplaceFilterState, newStatus: string, newSearch: string) => {
      const params = new URLSearchParams();
      if (newFilters.statuses.length > 0) {
        params.set("statuses", newFilters.statuses.join(","));
      }
      if (newFilters.minYield > 0) {
        params.set("minYield", newFilters.minYield.toString());
      }
      if (newFilters.fromDate) {
        params.set("fromDate", newFilters.fromDate);
      }
      if (newFilters.toDate) {
        params.set("toDate", newFilters.toDate);
      }
      if (newFilters.minAmount > 0) {
        params.set("minAmount", newFilters.minAmount.toString());
      }
      if (newFilters.maxAmount > 0) {
        params.set("maxAmount", newFilters.maxAmount.toString());
      }
      if (newStatus !== "all") {
        params.set("status", newStatus);
      }
      if (newSearch) {
        params.set("search", newSearch);
      }

      const queryString = params.toString();
      const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(targetUrl, { scroll: false });
    },
    [pathname, router]
  );

  const handleFilterChange = (newFilters: MarketplaceFilterState) => {
    setPanelFilters(newFilters);
    updateUrlParams(newFilters, status, debouncedSearch);
  };

  const queryParamsObj = useMemo(() => {
    const obj: Record<string, string> = {};
    if (panelFilters.statuses.length > 0) obj.statuses = panelFilters.statuses.join(",");
    if (panelFilters.minYield > 0) obj.minYield = panelFilters.minYield.toString();
    if (panelFilters.fromDate) obj.fromDate = panelFilters.fromDate;
    if (panelFilters.toDate) obj.toDate = panelFilters.toDate;
    if (status !== "all") obj.status = status;
    if (debouncedSearch) obj.search = debouncedSearch;
    // Part of the query key, so changing the page size starts a fresh query
    // rather than appending differently-sized pages to the existing list.
    obj.limit = String(pageSize);
    return obj;
  }, [panelFilters, status, debouncedSearch, pageSize]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
  } = useInfiniteQuery({
    queryKey: ["invoices", queryParamsObj],
    queryFn: ({ pageParam }) => fetchInvoices(pageParam as string | undefined, queryParamsObj),
    initialPageParam: initialCursorRef.current as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.next_cursor ?? undefined : undefined,
    refetchInterval: 30 * 1000,
    refetchIntervalInBackground: true,
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

  /**
   * Flattens the accumulated pages, de-duplicating by invoice id.
   *
   * Cursor pagination can legitimately hand back a row that straddles a page
   * boundary (the cursor is resolved after filtering, so a concurrent insert
   * can shift it), and a background refetch can append a page that overlaps
   * one already loaded. React would warn on duplicate keys and the grid would
   * show the same invoice twice, so first-seen wins.
   */
  const allInvoices = useMemo(() => {
    const seen = new Set<string>();
    const result: Invoice[] = [];
    for (const page of data?.pages ?? []) {
      for (const invoice of page.invoices) {
        if (seen.has(invoice.id)) continue;
        seen.add(invoice.id);
        result.push(invoice);
      }
    }
    return result;
  }, [data]);

  /**
   * Mirrors the furthest-loaded cursor into the URL (Issue #365).
   *
   * Written with `replace` rather than `push` so paging does not stack history
   * entries — a user who loaded five pages should go Back to where they came
   * from, not five times through the same list.
   *
   * On restore this resumes *from* that cursor rather than re-accumulating every
   * preceding page. That is the standard behaviour for cursor pagination and the
   * reason to prefer it over offsets: replaying N pages would mean N sequential
   * requests before the first paint, and the earlier cursors are not in the URL
   * to replay from anyway.
   */
  const lastCursor = useMemo(() => {
    const pages = data?.pages;
    if (!pages || pages.length === 0) return undefined;
    // The cursor that produced the final loaded page is the one before it.
    return pages.length > 1 ? pages[pages.length - 2]?.next_cursor ?? undefined : undefined;
  }, [data]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (lastCursor) {
      params.set("cursor", lastCursor);
    } else {
      params.delete("cursor");
    }

    if (pageSize !== DEFAULT_PAGE_SIZE) {
      params.set("pageSize", String(pageSize));
    } else {
      params.delete("pageSize");
    }

    if (category !== "all") {
      params.set("category", category);
    } else {
      params.delete("category");
    }

    if (namedSort) {
      params.set("sort", namedSort);
    } else {
      params.delete("sort");
    }

    const next = params.toString();
    // Only write when something actually changed, or the effect re-triggers
    // itself through `searchParams` on every render.
    if (next !== searchParams.toString()) {
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    }
  }, [lastCursor, pageSize, category, namedSort, pathname, router, searchParams]);

  const handlePageSizeChange = useCallback((value: string) => {
    const next = parsePageSize(value);
    // Clearing the restored cursor matters: a cursor issued for a 10-item page
    // is meaningless against a 50-item one, and reusing it would skip or repeat
    // rows.
    initialCursorRef.current = undefined;
    setPageSize(next);
  }, []);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setDebouncedSearch(value);
        updateUrlParams(panelFilters, status, value);
      }, 300);
    },
    [panelFilters, status, updateUrlParams]
  );

  const handleStatusChange = useCallback(
    (newStatus: "open" | "funded" | "settled" | "all") => {
      setStatus(newStatus);
      updateUrlParams(panelFilters, newStatus, debouncedSearch);
    },
    [panelFilters, debouncedSearch, updateUrlParams]
  );

  const handleSort = useCallback(
    (field: SortField) => {
      // Picking a column sort clears the named sort, and vice versa, so the
      // grid never appears to ignore a click.
      setNamedSort(null);
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

  const handleNamedSortChange = useCallback(
    (next: MarketplaceSort) => {
      setNamedSort(next);
      // A column sort would otherwise still take precedence and the dropdown
      // would appear inert.
      setSortField(null);
      setSortDirection("asc");
    },
    []
  );

  const handleCategoryChange = useCallback((next: InvoiceCategory) => {
    setCategory(next);
  }, []);

  const handleClearAll = useCallback(() => {
    const emptyFilters: MarketplaceFilterState = {
      statuses: [],
      minYield: 0,
      fromDate: "",
      toDate: "",
      minAmount: 0,
      maxAmount: 0,
    };
    setPanelFilters(emptyFilters);
    setStatus("all");
    setSearch("");
    setDebouncedSearch("");
    setSortField(null);
    setSortDirection("asc");
    setCategory("all");
    setNamedSort(null);
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  const filtered = useMemo(() => {
    let result = allInvoices.filter((inv) => {
      // Bar status filter
      const matchesBarStatus = status === "all" || inv.status === status;

      // Category tab filter (#452). Invoices with no recognised category are
      // only visible on the "All" tab — bucketing them into every category
      // would make the tab counts disagree with what the grid shows.
      const matchesCategory =
        category === "all" || resolveInvoiceCategory(inv.category) === category;

      // Panel funding status filter
      let matchesPanelStatus = true;
      if (panelFilters.statuses.length > 0) {
        matchesPanelStatus = panelFilters.statuses.some((st) => {
          if (st === "expired") {
            return isExpired(inv.due_date);
          }
          return inv.status === st;
        });
      }

      // Panel min yield filter
      let matchesYield = true;
      if (panelFilters.minYield > 0) {
        const y = inv.yield_percentage ?? 0;
        matchesYield = y >= panelFilters.minYield;
      }

      // Panel due date range filter
      let matchesFromDate = true;
      if (panelFilters.fromDate) {
        const invTime = new Date(inv.due_date).getTime();
        const fromTime = new Date(panelFilters.fromDate).getTime();
        matchesFromDate = invTime >= fromTime;
      }

      let matchesToDate = true;
      if (panelFilters.toDate) {
        const invTime = new Date(inv.due_date).getTime();
        // End of the day for toDate
        const toTime = new Date(`${panelFilters.toDate}T23:59:59.999Z`).getTime();
        matchesToDate = invTime <= toTime;
      }

      let matchesMinAmount = true;
      if (panelFilters.minAmount > 0) {
        matchesMinAmount = inv.amount >= panelFilters.minAmount;
      }

      let matchesMaxAmount = true;
      if (panelFilters.maxAmount > 0) {
        matchesMaxAmount = inv.amount <= panelFilters.maxAmount;
      }

      return (
        matchesBarStatus &&
        matchesCategory &&
        matchesPanelStatus &&
        matchesYield &&
        matchesFromDate &&
        matchesToDate &&
        matchesMinAmount &&
        matchesMaxAmount
      );
    });

    // Text search runs after the facet filters so it narrows an already-small
    // set. Matches title, issuer, invoice number, and id.
    result = searchInvoices(result, debouncedSearch);

    // A column sort and a named sort are mutually exclusive: whichever the
    // user picked last is the one that applies, so the grid never appears to
    // ignore a click.
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
    } else if (namedSort) {
      // No column sort active, so the named order (newest / highest yield /
      // closing soon) chosen from the dropdown applies.
      result = sortInvoices(result, namedSort);
    }
    // Otherwise: keep the order the API returned.

    return result;
  }, [
    allInvoices,
    status,
    category,
    debouncedSearch,
    panelFilters,
    sortField,
    sortDirection,
    namedSort,
  ]);

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Invoice Marketplace</h1>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-64 shrink-0">
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="flex-1 space-y-4" aria-busy="true" data-testid="marketplace-loading">
            {Array.from({ length: 5 }).map((_, i) => (
              <InvoiceCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <ComparisonProvider>
      <main className="container mx-auto px-4 py-8 pb-24 space-y-8">
        <h1 className="text-2xl font-bold">Invoice Marketplace</h1>

        {/* Featured: highest-yield live invoices, the discovery hook above the fold. */}
        <FeaturedInvoicesCarousel invoices={allInvoices} />

        <div className="flex flex-col md:flex-row gap-6">
          {/* Collapsible Filter Panel on the left */}
          <FilterPanel
            filters={panelFilters}
            onFilterChange={handleFilterChange}
            onClear={handleClearAll}
          />

          <div className="flex-1 space-y-4">
            <MarketplaceFilterBar
              status={status}
              search={search}
              onStatusChange={handleStatusChange}
              onSearchChange={handleSearchChange}
              onClear={handleClearAll}
            />

            {/* Category tabs. Client-side filter — no navigation, no reload. */}
            <CategoryTabs value={category} onChange={handleCategoryChange} />

            {isFetching && !isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground my-4">
                <Loader2 className="size-3 animate-spin" />
                Refreshing…
              </div>
            )}

            <div className="flex flex-wrap items-center gap-6 mb-4 mt-4 text-sm text-muted-foreground">
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

              <div className="ml-auto flex items-center gap-2">
                <label
                  htmlFor="marketplace-sort"
                  className="text-xs text-muted-foreground"
                >
                  Sort
                </label>
                <Select
                  value={namedSort ?? "newest"}
                  onValueChange={(value) =>
                    handleNamedSortChange(value as MarketplaceSort)
                  }
                >
                  <SelectTrigger
                    id="marketplace-sort"
                    className="h-8 w-[9.5rem]"
                    data-testid="marketplace-sort-select"
                  >
                    <SelectValue>{SORT_LABELS[namedSort ?? "newest"]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {SORT_LABELS[option]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <label
                  htmlFor="marketplace-page-size"
                  className="text-xs text-muted-foreground"
                >
                  Per page
                </label>
                <Select
                  value={String(pageSize)}
                  onValueChange={handlePageSizeChange}
                >
                  <SelectTrigger
                    id="marketplace-page-size"
                    className="h-8 w-[72px]"
                    data-testid="page-size-select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p
              className="text-sm text-muted-foreground"
              data-testid="marketplace-result-count"
              aria-live="polite"
            >
              {filtered.length} {filtered.length === 1 ? "invoice" : "invoices"}
            </p>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.length === 0 ? (
                <p className="py-12 text-center text-muted-foreground" data-testid="no-invoices-msg">
                  No invoices match your filters.
                </p>
              ) : (
                filtered.map((invoice) => (
                  <InvoiceRow key={invoice.id} invoice={invoice} />
                ))
              )}
              {isFetchingNextPage &&
                Array.from({ length: 3 }).map((_, i) => (
                  <InvoiceCardSkeleton key={`skeleton-${i}`} />
                ))}

              {/*
                The sentinel stays, so scrolling still auto-loads, and the
                button is added beside it (Issue #365). Both guard on
                `isFetchingNextPage`, so whichever fires first the other is a
                no-op. A button is not redundant with the observer: it is
                reachable by keyboard, it is what a screen reader announces, and
                it gives the user an explicit "end of what I asked for" stop
                instead of a list that grows as long as they keep scrolling.
              */}
              {hasNextPage && <div ref={sentinelRefCallback} className="h-4" />}

              {hasNextPage && (
                <div className="flex justify-center py-4">
                  <Button
                    variant="outline"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    data-testid="load-more-btn"
                  >
                    {isFetchingNextPage ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading…
                      </>
                    ) : (
                      `Load ${pageSize} more`
                    )}
                  </Button>
                </div>
              )}

              {!hasNextPage && filtered.length > 0 && (
                <p
                  className="text-center text-sm text-muted-foreground py-4"
                  data-testid="end-of-results"
                >
                  No more invoices
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
      <InvoiceComparisonBar />
    </ComparisonProvider>
  );
}
