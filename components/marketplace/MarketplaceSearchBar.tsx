"use client";

/**
 * Marketplace search bar and sort control (#452).
 *
 * The search input is debounced upstream (300ms) so typing doesn't fire a
 * request per keystroke; the visible value updates immediately so the field
 * never feels laggy while the list lags behind it.
 */

import { Search, X, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Invoice } from "@/lib/api";

/** Sort orders offered on the invoice grid. */
export const SORT_OPTIONS = ["newest", "highest_yield", "closing_soon"] as const;
export type MarketplaceSort = (typeof SORT_OPTIONS)[number];

export const SORT_LABELS: Record<MarketplaceSort, string> = {
  newest: "Newest",
  highest_yield: "Highest yield",
  closing_soon: "Closing soon",
};

interface MarketplaceSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  sort: MarketplaceSort;
  onSortChange: (sort: MarketplaceSort) => void;
  resultCount?: number;
}

export function MarketplaceSearchBar({
  value,
  onChange,
  onClear,
  sort,
  onSortChange,
  resultCount,
}: MarketplaceSearchBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search by title, issuer, or invoice number"
          aria-label="Search invoices by title, issuer, or invoice number"
          className="pl-9 pr-9"
          data-testid="marketplace-search-input"
        />
        {value.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            data-testid="marketplace-search-clear"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <ArrowUpDown
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <Select value={sort} onValueChange={(next) => onSortChange(next as MarketplaceSort)}>
          <SelectTrigger
            className="w-[10.5rem]"
            aria-label="Sort invoices"
            data-testid="marketplace-sort-select"
          >
            <SelectValue>{SORT_LABELS[sort]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {SORT_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {resultCount !== undefined && (
        <p
          className="text-sm text-muted-foreground sm:ml-2"
          data-testid="marketplace-result-count"
          aria-live="polite"
        >
          {resultCount} {resultCount === 1 ? "invoice" : "invoices"}
        </p>
      )}
    </div>
  );
}

/**
 * Client-side search across title, issuer, and invoice number.
 *
 * Empty query matches everything. An unparseable `created_at` sorts last
 * rather than poisoning the comparison.
 */
export function searchInvoices(invoices: Invoice[], query: string): Invoice[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return invoices;
  return invoices.filter((inv) => {
    const haystacks = [inv.title, inv.seller, inv.invoice_number ?? "", inv.id];
    return haystacks.some((field) =>
      String(field ?? "").toLowerCase().includes(trimmed)
    );
  });
}

/** Applies the grid's sort order. Does not mutate the input array. */
export function sortInvoices(invoices: Invoice[], sort: MarketplaceSort): Invoice[] {
  const result = [...invoices];
  switch (sort) {
    case "highest_yield":
      // Invoices without a published yield sort last instead of as 0%, which
      // would outrank genuinely low-yield listings.
      return result.sort((a, b) => {
        const ay = a.yield_percentage;
        const by = b.yield_percentage;
        if (typeof ay !== "number") return 1;
        if (typeof by !== "number") return -1;
        return by - ay;
      });
    case "closing_soon": {
      const now = Date.now();
      return result.sort((a, b) => {
        // Settled and expired invoices are not investable, so push them to
        // the end rather than letting a past due date read as "closing soon".
        const aLive = new Date(a.due_date).getTime() > now && a.status === "open";
        const bLive = new Date(b.due_date).getTime() > now && b.status === "open";
        if (aLive !== bLive) return aLive ? -1 : 1;
        const aTime = new Date(a.due_date).getTime();
        const bTime = new Date(b.due_date).getTime();
        if (Number.isNaN(aTime) || Number.isNaN(bTime)) return 0;
        return aTime - bTime;
      });
    }
    case "newest":
    default:
      return result.sort((a, b) => {
        // Falls back to the due date when the backend omits `created_at`, so
        // older payloads still produce a stable, non-NaN ordering.
        const aTime = new Date(a.created_at ?? a.due_date).getTime();
        const bTime = new Date(b.created_at ?? b.due_date).getTime();
        if (Number.isNaN(aTime) || Number.isNaN(bTime)) return 0;
        return bTime - aTime;
      });
  }
}
