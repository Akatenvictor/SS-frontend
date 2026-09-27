"use client";

/**
 * Price history chart for a secondary market listing detail page (#413).
 *
 * Shows how the ask price for an invoice's fractions has moved across all
 * of its secondary market listings, with a 7d/30d/all time range selector,
 * a tooltip with price + date + quantity, and the current ask price marked
 * on the chart. Hidden entirely when there isn't enough history to chart
 * (see MIN_HISTORY_POINTS_TO_CHART) regardless of which range is selected,
 * so switching ranges never makes an already-visible chart disappear.
 */

import { useMemo, useState } from "react";
import {
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInvoicePriceHistory } from "@/hooks/useInvoicePriceHistory";
import type { InvoicePriceHistoryPoint } from "@/lib/api";
import {
  filterHistoryByRange,
  latestHistoryPoint,
  PRICE_HISTORY_RANGE_LABELS,
  PRICE_HISTORY_RANGES,
  shouldShowPriceHistoryChart,
  type PriceHistoryRange,
} from "@/lib/priceHistory";

function formatPrice(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

function formatDate(date: string): string {
  const t = new Date(date);
  return Number.isNaN(t.getTime()) ? "" : t.toLocaleDateString();
}

interface ChartPoint extends InvoicePriceHistoryPoint {
  label: string;
  timestamp: number;
}

function toChartPoints(history: InvoicePriceHistoryPoint[]): ChartPoint[] {
  return history.map((point) => ({
    ...point,
    label: formatDate(point.date),
    timestamp: new Date(point.date).getTime(),
  }));
}

function PriceHistoryTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div
      className="rounded-md border bg-popover px-3 py-2 text-xs shadow-sm"
      data-testid="price-history-tooltip"
    >
      <p className="font-medium">{formatPrice(point.price)} XLM</p>
      <p className="text-muted-foreground">{point.label}</p>
      <p className="text-muted-foreground">Qty: {point.quantity}</p>
    </div>
  );
}

export function PriceHistoryChart({ invoiceId }: { invoiceId: string }) {
  const [range, setRange] = useState<PriceHistoryRange>("all");
  const { data, isLoading, isError } = useInvoicePriceHistory(invoiceId, range);

  const filtered = useMemo(
    () => (data ? filterHistoryByRange(data.history, range) : []),
    [data, range]
  );
  const chartPoints = useMemo(() => toChartPoints(filtered), [filtered]);
  const latest = useMemo(() => latestHistoryPoint(filtered), [filtered]);

  // Gate on the full, unfiltered history so narrowing the range never makes
  // a chart that was visible under "all time" disappear (#413).
  const hasEnoughHistory = data ? shouldShowPriceHistoryChart(data.history) : false;

  if (isLoading) {
    return (
      <Card data-testid="price-history-loading" aria-busy="true">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !data || !hasEnoughHistory) return null;

  const currentAskPrice = data.current_ask_price;
  const markerPoint =
    currentAskPrice !== null && latest
      ? chartPoints.find((p) => p.timestamp === new Date(latest.date).getTime())
      : undefined;

  return (
    <Card data-testid="price-history-chart">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Price history</CardTitle>
        <Tabs value={range} onValueChange={(v) => setRange(v as PriceHistoryRange)}>
          <TabsList>
            {PRICE_HISTORY_RANGES.map((r) => (
              <TabsTrigger key={r} value={r} data-testid={`price-history-range-${r}`}>
                {PRICE_HISTORY_RANGE_LABELS[r]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {chartPoints.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="price-history-empty-range">
            No listings in this range.
          </p>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartPoints}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} />
                <Tooltip content={<PriceHistoryTooltip />} />
                <Line
                  type="monotone"
                  dataKey="price"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                {markerPoint && (
                  <ReferenceDot
                    x={markerPoint.label}
                    y={markerPoint.price}
                    r={6}
                    fill="var(--primary)"
                    stroke="var(--background)"
                    strokeWidth={2}
                    data-testid="price-history-current-marker"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        {currentAskPrice !== null && (
          <p className="mt-2 text-xs text-muted-foreground">
            Current ask: <span className="font-medium text-foreground">{formatPrice(currentAskPrice)} XLM</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
