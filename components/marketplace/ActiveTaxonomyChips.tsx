"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  taxonomyFilterChips,
  type FilterChip,
  type TaxonomyFilterState,
} from "@/lib/invoiceTaxonomy";

interface ActiveTaxonomyChipsProps {
  filters: TaxonomyFilterState;
  onRemove: (chip: FilterChip) => void;
  onClearAll: () => void;
}

/**
 * Applied taxonomy filters as removable chips, above the results grid (#420).
 *
 * Deliberately separate from `FilterPanel`'s own chip block: that one is inside
 * the collapsible left rail, which a user browsing results on a narrow screen
 * has collapsed. Removing a filter has to be reachable from where the results
 * are being read, and the state has to stay visible when the rail is shut.
 */
export function ActiveTaxonomyChips({
  filters,
  onRemove,
  onClearAll,
}: ActiveTaxonomyChipsProps) {
  const chips = taxonomyFilterChips(filters);
  if (chips.length === 0) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      data-testid="taxonomy-filter-chips"
      aria-label="Applied filters"
    >
      <span className="text-xs font-medium text-muted-foreground">Applied filters</span>
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="inline-flex items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-xs"
          data-testid={`filter-chip-${chip.dimension}-${chip.value}`}
        >
          {chip.label}
          <button
            type="button"
            onClick={() => onRemove(chip)}
            className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
            aria-label={`Remove filter ${chip.label}`}
            data-testid={`remove-filter-${chip.dimension}-${chip.value}`}
          >
            <X className="size-3" aria-hidden="true" />
          </button>
        </span>
      ))}
      {chips.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-7 px-2 text-xs"
          data-testid="clear-taxonomy-filters-btn"
        >
          Clear all
        </Button>
      )}
    </div>
  );
}
