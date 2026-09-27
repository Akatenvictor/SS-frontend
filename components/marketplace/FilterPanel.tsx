"use client";

import { useState } from "react";
import { Filter, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export type FundingStatus = "open" | "funded" | "settled" | "expired";

export interface MarketplaceFilterState {
  statuses: FundingStatus[];
  minYield: number;
  fromDate: string;
  toDate: string;
  minAmount: number;
  maxAmount: number;
}

interface FilterPanelProps {
  filters: MarketplaceFilterState;
  onFilterChange: (newFilters: MarketplaceFilterState) => void;
  onClear: () => void;
}

const STATUS_OPTIONS: { label: string; value: FundingStatus }[] = [
  { label: "Open", value: "open" },
  { label: "Funded", value: "funded" },
  { label: "Settled", value: "settled" },
  { label: "Expired", value: "expired" },
];

export function FilterPanel({ filters, onFilterChange, onClear }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  const handleStatusToggle = (status: FundingStatus) => {
    const exists = filters.statuses.includes(status);
    const newStatuses = exists
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status];
    onFilterChange({ ...filters, statuses: newStatuses });
  };

  const activeCount =
    filters.statuses.length +
    (filters.minYield > 0 ? 1 : 0) +
    (filters.fromDate ? 1 : 0) +
    (filters.toDate ? 1 : 0) +
    (filters.minAmount > 0 ? 1 : 0) +
    (filters.maxAmount > 0 ? 1 : 0);

  return (
    <div className="w-full md:w-64 shrink-0 space-y-4">
      <div className="flex items-center justify-between rounded-lg border p-4 bg-card">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 font-semibold text-sm hover:text-foreground transition-colors"
          data-testid="toggle-filter-panel"
        >
          <Filter className="size-4" />
          <span>Filters</span>
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
              {activeCount}
            </Badge>
          )}
          {isOpen ? <ChevronUp className="size-4 ml-auto" /> : <ChevronDown className="size-4 ml-auto" />}
        </button>

        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-8 px-2 text-xs"
            data-testid="clear-filters-btn"
          >
            <X className="size-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="rounded-lg border p-4 space-y-6 bg-card" data-testid="filter-panel-content">
          {/* Funding Status Multi-select */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Funding Status
            </Label>
            <div className="flex flex-col gap-2">
              {STATUS_OPTIONS.map((opt) => {
                const checked = filters.statuses.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2 text-sm cursor-pointer hover:text-foreground"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleStatusToggle(opt.value)}
                      className="size-4 rounded border-gray-300 accent-primary"
                      data-testid={`filter-status-${opt.value}`}
                    />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Minimum Yield Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Min Yield (%)
              </Label>
              <span className="text-sm font-medium">{filters.minYield}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              step="1"
              value={filters.minYield}
              onChange={(e) =>
                onFilterChange({ ...filters, minYield: Number(e.target.value) })
              }
              className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
              data-testid="min-yield-slider"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>30%</span>
            </div>
          </div>

          {/* Due Date Range Picker */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Due Date Range
            </Label>
            <div className="space-y-2">
              <div>
                <Label htmlFor="from-date" className="text-xs text-muted-foreground mb-1 block">
                  From
                </Label>
                <Input
                  id="from-date"
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) =>
                    onFilterChange({ ...filters, fromDate: e.target.value })
                  }
                  data-testid="from-date-input"
                />
              </div>
              <div>
                <Label htmlFor="to-date" className="text-xs text-muted-foreground mb-1 block">
                  To
                </Label>
                <Input
                  id="to-date"
                  type="date"
                  value={filters.toDate}
                  onChange={(e) =>
                    onFilterChange({ ...filters, toDate: e.target.value })
                  }
                  data-testid="to-date-input"
                />
              </div>
            </div>
          </div>

          {/* Amount Range */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Amount Range (XLM)
            </Label>
            <div className="space-y-2">
              <div>
                <Label htmlFor="min-amount" className="text-xs text-muted-foreground mb-1 block">
                  Min
                </Label>
                <Input
                  id="min-amount"
                  type="number"
                  min="0"
                  step="100"
                  value={filters.minAmount || ""}
                  onChange={(e) =>
                    onFilterChange({ ...filters, minAmount: Number(e.target.value) || 0 })
                  }
                  placeholder="0"
                  data-testid="min-amount-input"
                />
              </div>
              <div>
                <Label htmlFor="max-amount" className="text-xs text-muted-foreground mb-1 block">
                  Max
                </Label>
                <Input
                  id="max-amount"
                  type="number"
                  min="0"
                  step="100"
                  value={filters.maxAmount || ""}
                  onChange={(e) =>
                    onFilterChange({ ...filters, maxAmount: Number(e.target.value) || 0 })
                  }
                  placeholder="Any"
                  data-testid="max-amount-input"
                />
              </div>
            </div>
          </div>

          {/* Active Filter Chips */}
          {activeCount > 0 && (
            <div className="space-y-2" data-testid="active-filter-chips">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Active Filters
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {filters.statuses.map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs gap-1">
                    {s}
                    <button
                      onClick={() => handleStatusToggle(s)}
                      className="ml-0.5 hover:text-foreground"
                      aria-label={`Remove ${s} filter`}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
                {filters.minYield > 0 && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    Yield ≥ {filters.minYield}%
                    <button
                      onClick={() => onFilterChange({ ...filters, minYield: 0 })}
                      className="ml-0.5 hover:text-foreground"
                    >
                      ×
                    </button>
                  </Badge>
                )}
                {filters.fromDate && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    From {filters.fromDate}
                    <button
                      onClick={() => onFilterChange({ ...filters, fromDate: "" })}
                      className="ml-0.5 hover:text-foreground"
                    >
                      ×
                    </button>
                  </Badge>
                )}
                {filters.toDate && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    To {filters.toDate}
                    <button
                      onClick={() => onFilterChange({ ...filters, toDate: "" })}
                      className="ml-0.5 hover:text-foreground"
                    >
                      ×
                    </button>
                  </Badge>
                )}
                {filters.minAmount > 0 && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    Min {filters.minAmount} XLM
                    <button
                      onClick={() => onFilterChange({ ...filters, minAmount: 0 })}
                      className="ml-0.5 hover:text-foreground"
                    >
                      ×
                    </button>
                  </Badge>
                )}
                {filters.maxAmount > 0 && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    Max {filters.maxAmount} XLM
                    <button
                      onClick={() => onFilterChange({ ...filters, maxAmount: 0 })}
                      className="ml-0.5 hover:text-foreground"
                    >
                      ×
                    </button>
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
