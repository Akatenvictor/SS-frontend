"use client";

/**
 * Marketplace category filter tabs (#452).
 *
 * Rendered as a real tablist so arrow-key navigation and screen-reader
 * semantics come from the roles rather than from re-implemented key handling.
 * Selection is client state only — filtering happens in the grid, so switching
 * tabs never triggers a navigation or a full page load.
 */

import {
  INVOICE_CATEGORIES,
  CATEGORY_LABELS,
  type InvoiceCategory,
} from "@/lib/api";

interface CategoryTabsProps {
  value: InvoiceCategory;
  onChange: (category: InvoiceCategory) => void;
  /** Optional per-category result counts, shown as a superscript. */
  counts?: Partial<Record<InvoiceCategory, number>>;
}

export function CategoryTabs({ value, onChange, counts }: CategoryTabsProps) {
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const index = INVOICE_CATEGORIES.indexOf(value);
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      const next = INVOICE_CATEGORIES[(index + 1) % INVOICE_CATEGORIES.length];
      onChange(next);
      document.getElementById(`category-tab-${next}`)?.focus();
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      const prev =
        INVOICE_CATEGORIES[
          (index - 1 + INVOICE_CATEGORIES.length) % INVOICE_CATEGORIES.length
        ];
      onChange(prev);
      document.getElementById(`category-tab-${prev}`)?.focus();
    }
  }

  return (
    <div
      role="tablist"
      aria-label="Invoice categories"
      className="flex flex-wrap gap-2"
      onKeyDown={handleKeyDown}
      data-testid="category-tabs"
    >
      {INVOICE_CATEGORIES.map((category) => {
        const active = value === category;
        const count = counts?.[category];
        return (
          <button
            key={category}
            id={`category-tab-${category}`}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(category)}
            className={
              active
                ? "rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors"
                : "rounded-full border border-border bg-background px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            }
            data-testid={`category-tab-${category}`}
            data-active={active ? "true" : "false"}
          >
            {CATEGORY_LABELS[category]}
            {count !== undefined && (
              <span className="ml-1.5 text-xs opacity-70">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
