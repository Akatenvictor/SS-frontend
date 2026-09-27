"use client";

import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCompareContext } from "@/context/CompareContext";
import { toComparableInvoice, type ComparableInvoice } from "@/lib/compare";
import type { Invoice } from "@/lib/api";
import { cn } from "@/lib/utils";

interface AddToCompareButtonProps {
  /** Either a marketplace invoice or a pre-flattened comparison snapshot. */
  invoice: Invoice | ComparableInvoice;
  className?: string;
  /** Renders the label beside the icon instead of icon-only. */
  showLabel?: boolean;
}

function isComparable(invoice: Invoice | ComparableInvoice): invoice is ComparableInvoice {
  return "face_value" in invoice;
}

export function AddToCompareButton({
  invoice,
  className,
  showLabel = true,
}: AddToCompareButtonProps) {
  const { toggle, isSelected, isFull, maxItems } = useCompareContext();
  const comparable = isComparable(invoice) ? invoice : toComparableInvoice(invoice);

  const selected = isSelected(comparable.id);
  // At the cap a selected item must still be removable, so only unselected
  // items lock out.
  const locked = isFull && !selected;

  const label = selected
    ? "Remove from compare"
    : locked
      ? `You can compare up to ${maxItems} invoices. Remove one first.`
      : "Add to compare";

  const button = (
    <Button
      type="button"
      variant={selected ? "secondary" : "outline"}
      size={showLabel ? "sm" : "icon"}
      aria-pressed={selected}
      aria-label={selected ? `Remove ${comparable.title} from compare` : `Add ${comparable.title} to compare`}
      // A disabled button cannot receive focus, so it is wrapped in a span to
      // keep the tooltip reachable by keyboard and by pointer events.
      className={cn(locked && "pointer-events-none opacity-50", className)}
      disabled={locked}
      onClick={() => toggle(comparable)}
      data-testid={`add-to-compare-${comparable.id}`}
    >
      {selected ? (
        <Check className="size-4" />
      ) : (
        <Plus className="size-4" />
      )}
      {showLabel && (selected ? "In compare" : "Add to compare")}
    </Button>
  );

  if (!locked) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* A disabled button emits no pointer events and cannot take focus, so
            the trigger is a focusable span that keeps the tooltip reachable. */}
        <span
          tabIndex={0}
          className="inline-flex"
          data-testid={`compare-locked-wrapper-${comparable.id}`}
        >
          {button}
        </span>
      </TooltipTrigger>
      <TooltipContent role="tooltip" data-testid={`compare-limit-tooltip-${comparable.id}`}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
