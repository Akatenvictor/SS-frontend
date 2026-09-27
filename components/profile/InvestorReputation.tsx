"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvestorReputation } from "@/hooks/useInvestorReputation";
import { getReputationTier } from "@/lib/api";
import { Award, ShieldCheck, Sparkles } from "lucide-react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function tierIcon(tier: string) {
  if (tier === "Verified") return Award;
  if (tier === "Trusted") return ShieldCheck;
  return Sparkles;
}

export function InvestorReputation({ wallet }: { wallet: string }) {
  const { data, isLoading, isError } = useInvestorReputation(wallet);

  if (isLoading) {
    return (
      <Card data-testid="investor-reputation-loading" aria-busy="true">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) return null;

  const tier = data.tier ?? getReputationTier(data.score);
  const TierIcon = tierIcon(tier);

  return (
    <Card data-testid="investor-reputation">
      <CardHeader>
        <CardTitle>Investor Reputation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold"
            data-testid="reputation-score"
          >
            {data.score}
          </span>
          <div>
            <Badge
              variant={tier === "New" ? "outline" : "secondary"}
              data-testid="reputation-tier"
            >
              <TierIcon className="mr-1 size-3.5" />
              {tier}
            </Badge>
            <p className="mt-1 text-xs text-muted-foreground">
              Based on investment history, governance and activity
            </p>
          </div>
        </div>

        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-3"
          data-testid="reputation-breakdown"
        >
          <div data-testid="reputation-investments">
            <p className="text-sm text-muted-foreground">
              Investments completed
            </p>
            <p className="text-2xl font-bold">{data.investments_completed}</p>
          </div>
          <div data-testid="reputation-votes">
            <p className="text-sm text-muted-foreground">Governance votes</p>
            <p className="text-2xl font-bold">{data.governance_votes}</p>
          </div>
          <div data-testid="reputation-tenure">
            <p className="text-sm text-muted-foreground">Platform tenure</p>
            <p className="text-2xl font-bold">
              {data.platform_tenure_days}{" "}
              <span className="text-sm font-normal">days</span>
            </p>
          </div>
        </div>

        <div data-testid="reputation-history">
          <h3 className="mb-2 text-sm font-semibold">Score history</h3>
          {data.history.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No history yet — your score updates as you invest and vote.
            </p>
          ) : (
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.history.map((p) => ({
                    ...p,
                    label: p.date
                      ? new Date(p.date).toLocaleDateString()
                      : "",
                  }))}
                >
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="score"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
