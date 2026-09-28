"use client";

import { Tag } from "lucide-react";
import { invoiceTags } from "@/lib/invoiceTaxonomy";
import type { Invoice } from "@/lib/api";

/** Beyond this the pills wrap the card header and push the amounts down. */
const MAX_VISIBLE_TAGS = 4;

interface InvoiceTagPillsProps {
  invoice: Pick<Invoice, "tags" | "id">;
  /** Cap the rendered pills; the remainder collapses into a "+N" counter. */
  max?: number;
}

/**
 * Issuer-set tags as pills on an invoice card (#420).
 *
 * Purely presentational — it reads `invoice.tags` and nothing else, so the
 * pills always reflect what the issuer set and never a locally derived guess.
 */
export function InvoiceTagPills({ invoice, max = MAX_VISIBLE_TAGS }: InvoiceTagPillsProps) {
  const tags = invoiceTags(invoice);
  if (tags.length === 0) return null;

  const visible = tags.slice(0, max);
  const overflow = tags.length - visible.length;

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      data-testid={`invoice-tags-${invoice.id}`}
      aria-label="Invoice tags"
    >
      {visible.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-0.5 text-xs text-muted-foreground"
          data-testid="invoice-tag-pill"
        >
          <Tag className="size-3" aria-hidden="true" />
          {tag}
        </span>
      ))}
      {overflow > 0 && (
        <span
          className="rounded-full border bg-muted px-2 py-0.5 text-xs text-muted-foreground"
          data-testid="invoice-tag-overflow"
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
