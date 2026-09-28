"use client";

import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MAX_COMPARE_INVOICES, useComparison } from "./InvoiceComparisonContext";
import type { Invoice } from "@/lib/api";
import { cn } from "@/lib/utils";

interface CompareToggleButtonProps {
  invoice: Invoice;
  className?: string;
}

/**
 * Adds or removes an invoice from the comparison tray.
 *
 * At the cap an unselected invoice is disabled, with the reason exposed in a
 * tooltip. A disabled button emits no pointer events and cannot take focus, so
 * the trigger is a focusable span and the tooltip wraps a TooltipProvider —
 * matching how the other tooltip consumers in the app are wired.
 */
export function CompareToggleButton({ invoice, className }: CompareToggleButtonProps) {
  const { addToCompare, removeFromCompare, isInCompare, compareInvoices } = useComparison();

  const inCompare = isInCompare(invoice.id);
  // At the cap a selected invoice must stay removable, so only unselected ones
  // lock out.
  const locked = !inCompare && compareInvoices.length >= MAX_COMPARE_INVOICES;

  const label = inCompare
    ? "Remove from compare"
    : locked
      ? `You can compare up to ${MAX_COMPARE_INVOICES} invoices. Remove one first.`
      : "Add to compare";

  const button = (
    <Button
      variant="outline"
      size="icon"
      aria-pressed={inCompare}
      aria-label={
        inCompare
          ? `Remove ${invoice.title} from compare`
          : `Add ${invoice.title} to compare`
      }
      className={cn(locked && "opacity-50", className)}
      disabled={locked}
      onClick={() =>
        inCompare ? removeFromCompare(invoice.id) : addToCompare(invoice)
      }
      data-testid={`compare-toggle-${invoice.id}`}
    >
      <Scale className="h-4 w-4" />
    </Button>
  );

  if (!locked) {
    return button;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="inline-flex" data-testid={`compare-locked-${invoice.id}`}>
            {button}
          </span>
        </TooltipTrigger>
        <TooltipContent role="tooltip">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
