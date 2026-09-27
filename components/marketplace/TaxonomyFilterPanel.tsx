"use client";

import { Label } from "@/components/ui/label";
import {
  CATEGORY_OPTIONS,
  RISK_TIER_OPTIONS,
  REGION_OPTIONS,
  hasActiveTaxonomyFilters,
  taxonomyFilterCount,
  toggleTaxonomyFilter,
  type TaxonomyDimension,
  type TaxonomyFilterState,
} from "@/lib/invoiceTaxonomy";

/** Dimension key in the state object, keyed by the singular dimension name. */
const DIMENSION_KEYS: Record<TaxonomyDimension, keyof TaxonomyFilterState> = {
  category: "categories",
  riskTier: "riskTiers",
  region: "regions",
};

interface TaxonomyFilterPanelProps {
  filters: TaxonomyFilterState;
  onFilterChange: (filters: TaxonomyFilterState) => void;
}

const DIMENSIONS: {
  key: TaxonomyDimension;
  label: string;
  testId: string;
  options: { value: string; label: string }[];
}[] = [
  {
    key: "category",
    label: "Category",
    testId: "category",
    options: CATEGORY_OPTIONS,
  },
  {
    key: "riskTier",
    label: "Risk Tier",
    testId: "risk",
    options: RISK_TIER_OPTIONS,
  },
  {
    key: "region",
    label: "Region",
    testId: "region",
    options: REGION_OPTIONS,
  },
];

/**
 * The three taxonomy dimensions — sector, risk and geography — as checkbox
 * groups (#420).
 *
 * Checkboxes rather than a `<Select>` because each dimension is a multi-select:
 * a single-value dropdown would force a user chasing "any high-risk invoice"
 * through three separate round trips to the URL.
 */
export function TaxonomyFilterPanel({
  filters,
  onFilterChange,
}: TaxonomyFilterPanelProps) {
  return (
    <div className="space-y-6" data-testid="taxonomy-filter-panel">
      {DIMENSIONS.map((dimension) => {
        const selected = filters[DIMENSION_KEYS[dimension.key]] as string[];
        const labelId = `taxonomy-${dimension.key}-label`;
        return (
          <div className="space-y-3" key={dimension.key}>
            <Label
              id={labelId}
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            >
              {dimension.label}
            </Label>
            {/*
              A group rather than a <fieldset>: the dimension holds several
              independent checkboxes, and role="group" + aria-labelledby
              announces it as one control set to a screen reader without
              pulling in the fieldset/legend styling the panels do not use.
            */}
            <div
              className="flex flex-col gap-2"
              role="group"
              aria-labelledby={labelId}
            >
              {dimension.options.map((option) => {
                const checked = selected.includes(option.value);
                return (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 text-sm cursor-pointer hover:text-foreground"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        onFilterChange(
                          toggleTaxonomyFilter(filters, dimension.key, option.value)
                        )
                      }
                      className="size-4 rounded border-gray-300 accent-primary"
                      data-testid={`filter-taxonomy-${dimension.testId}-${option.value}`}
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}

      {hasActiveTaxonomyFilters(filters) && (
        <p className="text-xs text-muted-foreground" data-testid="taxonomy-active-count">
          {taxonomyFilterCount(filters)} taxonomy filter
          {taxonomyFilterCount(filters) === 1 ? "" : "s"} applied
        </p>
      )}
    </div>
  );
}
