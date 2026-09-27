"use client";

import { Filter, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RESALE_INVOICE_TYPES } from "@/lib/api";
import {
  EMPTY_SECONDARY_MARKET_FILTERS,
  hasActiveFilters,
  type SecondaryMarketFilters,
} from "@/lib/secondaryMarket";

const INVOICE_TYPE_LABELS: Record<string, string> = {
  all: "All types",
  trade_receivable: "Trade receivable",
  supply_chain: "Supply chain",
  promissory_note: "Promissory note",
  equipment_lease: "Equipment lease",
  service_contract: "Service contract",
  other: "Other",
};

interface SecondaryMarketFiltersProps {
  filters: SecondaryMarketFilters;
  onChange: (filters: SecondaryMarketFilters) => void;
  onClear: () => void;
  resultCount: number;
  totalCount: number;
}

/**
 * Filters for the secondary market (issue #380): invoice type, an
 * implied-yield band, a price band and a maturity horizon. Every control
 * narrows the grid in place — nothing here navigates or reloads.
 */
export function SecondaryMarketFiltersPanel({
  filters,
  onChange,
  onClear,
  resultCount,
  totalCount,
}: SecondaryMarketFiltersProps) {
  function update<K extends keyof SecondaryMarketFilters>(
    key: K,
    value: SecondaryMarketFilters[K]
  ) {
    onChange({ ...filters, [key]: value });
  }

  function numberField(id: string, label: string, value: number, onValue: (n: number) => void) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id} className="text-xs">
          {label}
        </Label>
        <Input
          id={id}
          type="number"
          min={0}
          step="0.01"
          value={Number.isFinite(value) && value > 0 ? value : ""}
          placeholder="Any"
          onChange={(event) => onValue(Number(event.target.value) || 0)}
          data-testid={id}
        />
      </div>
    );
  }

  return (
    <section
      aria-label="Listing filters"
      data-testid="secondary-market-filters"
      className="w-full shrink-0 space-y-4 rounded-xl border p-4 md:w-64"
    >
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Filter className="h-4 w-4" />
          Filters
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClear}
          disabled={!hasActiveFilters(filters)}
          data-testid="clear-filters-btn"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Clear
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="invoice-type" className="text-xs">
          Invoice type
        </Label>
        <Select
          value={filters.invoiceType}
          onValueChange={(value) => update("invoiceType", value)}
        >
          <SelectTrigger id="invoice-type" className="w-full" data-testid="invoice-type-select">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {RESALE_INVOICE_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {INVOICE_TYPE_LABELS[type] ?? type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-1 text-xs font-medium">Implied yield (%)</legend>
        <div className="grid grid-cols-2 gap-2">
          {numberField("min-yield", "Min", filters.minYield, (n) => update("minYield", n))}
          {numberField("max-yield", "Max", filters.maxYield, (n) => update("maxYield", n))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="mb-1 text-xs font-medium">Ask price (XLM)</legend>
        <div className="grid grid-cols-2 gap-2">
          {numberField("min-price", "Min", filters.minPrice, (n) => update("minPrice", n))}
          {numberField("max-price", "Max", filters.maxPrice, (n) => update("maxPrice", n))}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="max-days" className="text-xs">
          Days to maturity
        </Label>
        <Input
          id="max-days"
          type="number"
          min={0}
          value={filters.maxDaysToMaturity > 0 ? filters.maxDaysToMaturity : ""}
          placeholder="Any"
          onChange={(event) => update("maxDaysToMaturity", Number(event.target.value) || 0)}
          data-testid="max-days"
        />
      </div>

      <p className="text-xs text-muted-foreground" data-testid="filter-result-count">
        {resultCount} of {totalCount} {totalCount === 1 ? "listing" : "listings"}
      </p>
    </section>
  );
}

export { EMPTY_SECONDARY_MARKET_FILTERS, INVOICE_TYPE_LABELS };
