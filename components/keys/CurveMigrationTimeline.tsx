"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Clock, CheckCircle2, AlertCircle } from "lucide-react";

interface CurveMigration {
  id: string;
  status: "pending" | "timelocked" | "executed";
  proposedAt: string;
  timelockExpiry: string;
  executedAt?: string;
  proposedParams: {
    label: string;
    value: string;
  }[];
  governanceStatus: {
    approvalPercentage: number;
    votesRequired: number;
    votesReceived: number;
  };
}

interface MigrationTimelineProps {
  keyId: string;
  isCreator: boolean;
}

function useNow() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return now;
}

function formatCountdown(expiresAt: string, now: number): string {
  const remaining = new Date(expiresAt).getTime() - now;
  if (!Number.isFinite(remaining) || remaining <= 0) return "Ready to execute";

  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

async function fetchCurveMigrations(keyId: string): Promise<CurveMigration[]> {
  const res = await fetch(`/api/keys/${keyId}/migrations`);
  if (!res.ok) throw new Error("Failed to fetch migrations");
  return res.json();
}

export function CurveMigrationTimeline({ keyId, isCreator }: MigrationTimelineProps) {
  const now = useNow();
  const { data: migrations, isLoading } = useQuery({
    queryKey: ["curve-migrations", keyId],
    queryFn: () => fetchCurveMigrations(keyId),
  });

  const pendingMigrations = useMemo(
    () => migrations?.filter((m) => m.status === "pending" || m.status === "timelocked") ?? [],
    [migrations]
  );

  const executedMigrations = useMemo(
    () => migrations?.filter((m) => m.status === "executed") ?? [],
    [migrations]
  );

  if (!isCreator) return null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Curve Migrations</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!migrations || migrations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Curve Migrations</h3>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No curve migrations proposed yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {pendingMigrations.length > 0 && (
        <Card data-testid="pending-migrations-card">
          <CardHeader>
            <h3 className="text-lg font-semibold">Pending Migrations</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingMigrations.map((migration) => (
              <div
                key={migration.id}
                className="border rounded-lg p-4 space-y-3"
                data-testid={`migration-${migration.id}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      <Badge variant="outline">Pending</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatCountdown(migration.timelockExpiry, now)}
                    </p>
                  </div>
                  {migration.status === "timelocked" && isCreator && (
                    <Button
                      size="sm"
                      data-testid={`execute-migration-${migration.id}`}
                    >
                      Execute
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold">Proposed Parameters:</p>
                  <div className="bg-muted/50 rounded p-2 space-y-1">
                    {migration.proposedParams.map((param, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between text-xs text-muted-foreground"
                      >
                        <span>{param.label}:</span>
                        <span className="font-mono">{param.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold">Governance Approval:</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        {migration.governanceStatus.votesReceived} /
                        {migration.governanceStatus.votesRequired} votes
                      </span>
                      <span className="font-semibold">
                        {migration.governanceStatus.approvalPercentage.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-green-500 h-full transition-all duration-300"
                        style={{
                          width: `${Math.min(
                            100,
                            migration.governanceStatus.approvalPercentage
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {executedMigrations.length > 0 && (
        <Card data-testid="executed-migrations-card">
          <CardHeader>
            <h3 className="text-lg font-semibold">Executed Migrations</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            {executedMigrations.map((migration) => (
              <div
                key={migration.id}
                className="border rounded-lg p-4 space-y-3 opacity-75"
                data-testid={`executed-migration-${migration.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <Badge variant="secondary">Executed</Badge>
                  </div>
                  {migration.executedAt && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(migration.executedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold">Applied Parameters:</p>
                  <div className="bg-muted/50 rounded p-2 space-y-1">
                    {migration.proposedParams.map((param, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between text-xs text-muted-foreground"
                      >
                        <span>{param.label}:</span>
                        <span className="font-mono">{param.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
