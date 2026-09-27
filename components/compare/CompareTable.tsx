"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { FundingProgressBar } from "@/components/invoices/FundingProgressBar";
import { formatBpsAsPercent, formatXLM } from "@/lib/format";
import { formatDate } from "@/lib/issuers";
import {
  compareFundingPercent,
  isInvestable,
  type ComparableInvoice,
} from "@/lib/compare";
import { cn } from "@/lib/utils";

interface CompareRow {
  label: string;
  /** Rendered per column, so each row can show its own formatting. */
  render: (invoice: ComparableInvoice) => React.ReactNode;
  testId: string;
}

const ROWS: CompareRow[] = [
  {
    label: "Annualised yield",
    testId: "row-yield",
    render: (invoice) => formatBpsAsPercent(invoice.yield_bps),
  },
  {
    label: "Maturity date",
    testId: "row-maturity",
    render: (invoice) => formatDate(invoice.maturity_date),
  },
  {
    label: "Face value",
    testId: "row-face-value",
    render: (invoice) => formatXLM(invoice.face_value),
  },
  {
    label: "Issuer",
    testId: "row-issuer",
    render: (invoice) => (
      <Link
        href={`/issuers/${encodeURIComponent(invoice.issuer_id)}`}
        className="font-medium hover:underline"
      >
        {invoice.issuer_name}
      </Link>
    ),
  },
  {
    label: "Issuer score",
    testId: "row-issuer-score",
    render: (invoice) =>
      invoice.issuer_score === null ? (
        <span className="text-muted-foreground">No track record</span>
      ) : (
        <span className="font-semibold tabular-nums">{invoice.issuer_score}</span>
      ),
  },
  {
    label: "Status",
    testId: "row-status",
    render: (invoice) => <InvoiceStatusBadge status={invoice.status} />,
  },
  {
    label: "Investors",
    testId: "row-investors",
    render: (invoice) => invoice.investor_count,
  },
  {
    label: "Funding progress",
    testId: "row-funding",
    render: (invoice) => (
      <div className="space-y-1">
        <p className="text-xs font-medium tabular-nums">
          {compareFundingPercent(invoice).toFixed(1)}%
        </p>
        <FundingProgressBar
          raised={invoice.raised}
          target={invoice.face_value}
          investorCount={invoice.investor_count}
        />
      </div>
    ),
  },
];

interface CompareTableProps {
  items: ComparableInvoice[];
  /** Injected so investability is deterministic under test. */
  now?: Date;
}

/** Side-by-side comparison of the selected invoices across key metrics. */
export function CompareTable({ items, now }: CompareTableProps) {
  const referenceDate = now ?? new Date();

  if (items.length === 0) {
    return (
      <div
        data-testid="compare-empty"
        className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center"
      >
        <h2 className="text-xl font-semibold">Nothing to compare yet</h2>
        <p className="text-muted-foreground">
          Select up to three invoices from the marketplace to compare them here.
        </p>
        <Button asChild>
          <Link href="/marketplace">Browse the marketplace</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-sm" data-testid="compare-table">
        <caption className="sr-only">
          Side-by-side comparison of {items.length} selected invoices
        </caption>
        <thead>
          <tr>
            <th scope="col" className="w-44 border-b p-3 text-left align-bottom">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Metric
              </span>
            </th>
            {items.map((item) => (
              <th
                key={item.id}
                scope="col"
                data-testid={`compare-column-${item.id}`}
                className="min-w-[12rem] border-b p-3 text-left align-bottom"
              >
                <Link
                  href={`/marketplace/${item.id}`}
                  className="font-semibold hover:underline"
                >
                  {item.title}
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.testId} data-testid={row.testId}>
              <th
                scope="row"
                className="border-b p-3 text-left align-top font-medium text-muted-foreground"
              >
                {row.label}
              </th>
              {items.map((item) => (
                <td
                  key={`${row.testId}-${item.id}`}
                  data-testid={`${row.testId}-${item.id}`}
                  className={cn("border-b p-3 align-top tabular-nums")}
                >
                  {row.render(item)}
                </td>
              ))}
            </tr>
          ))}
          <tr data-testid="row-cta">
            <th scope="row" className="p-3 text-left align-top font-medium text-muted-foreground">
              Action
            </th>
            {items.map((item) => (
              <td key={`cta-${item.id}`} className="p-3 align-top">
                {isInvestable(item, referenceDate) ? (
                  <Button asChild className="w-full" size="sm">
                    <Link
                      href={`/marketplace/${item.id}`}
                      data-testid={`compare-invest-${item.id}`}
                    >
                      Invest
                    </Link>
                  </Button>
                ) : (
                  <span
                    data-testid={`compare-closed-${item.id}`}
                    className="text-xs text-muted-foreground"
                  >
                    Not open for investment
                  </span>
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
