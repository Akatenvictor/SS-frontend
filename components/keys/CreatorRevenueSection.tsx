"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useCreatorRevenue } from "@/hooks/useCreatorRevenue";
import type { MonthlyRevenue } from "@/lib/api";

interface CreatorRevenueSectionProps {
  keyId: string;
}

const MONTHS_SHOWN = 12;

function formatXlm(value: number): string {
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 7,
  })} XLM`;
}

function formatMonthLabel(month: string): string {
  const parsed = new Date(`${month}-01T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return month;
  }
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    timeZone: "UTC",
  });
}

function lastTwelveMonths(breakdown: MonthlyRevenue[]): MonthlyRevenue[] {
  return breakdown.slice(-MONTHS_SHOWN);
}

function RevenueStatCard({
  label,
  value,
  testId,
}: {
  label: string;
  value: number;
  testId: string;
}) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold" data-testid={testId}>
        {formatXlm(value)}
      </p>
    </div>
  );
}

export function CreatorRevenueSection({ keyId }: CreatorRevenueSectionProps) {
  const { jwt } = useAuth();
  const revenueQuery = useCreatorRevenue(keyId, jwt);

  if (revenueQuery.isLoading) {
    return (
      <Card data-testid="creator-revenue-loading">
        <CardHeader>
          <h2 className="text-lg font-semibold">Revenue</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
          <Skeleton className="h-56 w-full" />
        </CardContent>
      </Card>
    );
  }

  const revenue = revenueQuery.data;

  if (!revenue) {
    return null;
  }

  if (revenue.tradeCount === 0) {
    return (
      <Card data-testid="creator-revenue-section">
        <CardHeader>
          <h2 className="text-lg font-semibold">Revenue</h2>
        </CardHeader>
        <CardContent>
          <p
            className="text-sm text-muted-foreground"
            data-testid="creator-revenue-empty"
          >
            No revenue yet
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = lastTwelveMonths(revenue.monthlyBreakdown).map((entry) => ({
    ...entry,
    label: formatMonthLabel(entry.month),
  }));

  return (
    <Card data-testid="creator-revenue-section">
      <CardHeader>
        <h2 className="text-lg font-semibold">Revenue</h2>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <RevenueStatCard
            label="Total royalties earned"
            value={revenue.totalRoyaltyEarned}
            testId="revenue-total"
          />
          <RevenueStatCard
            label="Buy royalties"
            value={revenue.buyRoyaltyEarned}
            testId="revenue-buy"
          />
          <RevenueStatCard
            label="Sell royalties"
            value={revenue.sellRoyaltyEarned}
            testId="revenue-sell"
          />
        </div>

        <div className="h-64 w-full" data-testid="revenue-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={72} />
              <Tooltip
                formatter={(value: number) => [formatXlm(value), "Royalties"]}
              />
              <Bar
                dataKey="royaltyEarned"
                name="Royalties"
                fill="var(--primary)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <ul className="sr-only" data-testid="revenue-chart-values">
          {chartData.map((entry) => (
            <li key={entry.month}>
              {entry.label}: {formatXlm(entry.royaltyEarned)}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
