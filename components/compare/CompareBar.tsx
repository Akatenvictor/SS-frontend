"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompareContext } from "@/context/CompareContext";
import { formatBpsAsPercent } from "@/lib/format";

/**
 * Sticky tray summarising the current comparison. Renders nothing while the
 * comparison is empty so it never occupies space on the marketplace.
 */
export function CompareBar() {
  const { items, maxItems, remove, clear } = useCompareContext();

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      data-testid="compare-bar"
      className="sticky bottom-0 z-40 border-t bg-background/95 backdrop-blur"
    >
      <div className="container mx-auto flex flex-wrap items-center gap-3 px-4 py-3">
        <p className="text-sm font-medium" data-testid="compare-bar-count">
          {items.length} of {maxItems} selected
        </p>

        <ul className="flex flex-1 flex-wrap items-center gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <span
                data-testid={`compare-bar-item-${item.id}`}
                className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs"
              >
                <span className="max-w-[12rem] truncate">{item.title}</span>
                <span className="text-muted-foreground">
                  {formatBpsAsPercent(item.yield_bps)}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${item.title} from compare`}
                  data-testid={`compare-bar-remove-${item.id}`}
                  onClick={() => remove(item.id)}
                  className="ml-1 rounded-full p-0.5 hover:bg-muted"
                >
                  <X className="size-3" />
                </button>
              </span>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={clear}
            data-testid="compare-bar-clear"
          >
            Clear all
          </Button>
          <Button asChild size="sm" disabled={items.length === 0}>
            <Link href="/marketplace/compare" data-testid="compare-bar-view">
              Compare
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
