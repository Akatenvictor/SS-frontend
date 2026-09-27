"use client";

import { useMemo, useRef } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  BadgeCheck,
  FilePlus2,
  HandCoins,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlatformActivity } from "@/hooks/usePlatformActivity";
import type { PlatformActivityEventType } from "@/lib/api";

const EVENT_STYLES: Record<
  PlatformActivityEventType,
  { icon: LucideIcon; label: string; className: string }
> = {
  new_investment: {
    icon: HandCoins,
    label: "New investment",
    className: "bg-green-100 text-green-700",
  },
  invoice_funded: {
    icon: BadgeCheck,
    label: "Invoice fully funded",
    className: "bg-blue-100 text-blue-700",
  },
  invoice_settled: {
    icon: ArrowDownToLine,
    label: "Invoice settled",
    className: "bg-purple-100 text-purple-700",
  },
  new_listing: {
    icon: FilePlus2,
    label: "New listing",
    className: "bg-amber-100 text-amber-700",
  },
};

export function describePlatformEvent(event: {
  type: PlatformActivityEventType;
  title: string;
  amount?: number;
}): string {
  const style = EVENT_STYLES[event.type];
  const amountSuffix =
    event.amount !== undefined ? ` for ${event.amount.toLocaleString()} XLM` : "";
  switch (event.type) {
    case "new_investment":
      return `New investment in ${event.title}${amountSuffix}`;
    case "invoice_funded":
      return `${event.title} fully funded`;
    case "invoice_settled":
      return `${event.title} settled`;
    case "new_listing":
      return `New listing: ${event.title}${amountSuffix}`;
    default:
      return `${style.label}: ${event.title}`;
  }
}

export function PlatformActivityFeed({ limit = 20 }: { limit?: number }) {
  const { data, isLoading } = usePlatformActivity(limit);
  const previousIdsRef = useRef<Set<string>>(new Set());

  const events = useMemo(() => {
    const list = (data ?? []).slice(0, limit);
    // Reverse chronological order (newest first).
    return [...list].sort((a, b) => {
      const ta = new Date(a.created_at).getTime() || 0;
      const tb = new Date(b.created_at).getTime() || 0;
      return tb - ta;
    });
  }, [data, limit]);

  const freshIds = useMemo(() => {
    const current = new Set(events.map((e) => e.id));
    const prev = previousIdsRef.current;
    const fresh = new Set<string>();
    if (prev.size > 0) {
      for (const id of current) {
        if (!prev.has(id)) fresh.add(id);
      }
    }
    previousIdsRef.current = current;
    return fresh;
  }, [events]);

  if (isLoading) {
    return (
      <Card data-testid="platform-activity-loading" aria-busy="true">
        <CardHeader>
          <CardTitle>Platform Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!events || events.length === 0) return null;

  return (
    <Card data-testid="platform-activity-feed">
      <CardHeader>
        <CardTitle>Platform Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {events.map((event) => {
            const style = EVENT_STYLES[event.type];
            const Icon = style.icon;
            const isNew = freshIds.has(event.id);
            return (
              <li
                key={event.id}
                data-testid={`platform-event-${event.id}`}
                className={isNew ? "animate-in fade-in slide-in-from-top-2" : undefined}
                {...(isNew ? { "data-new-event": "true" } : {})}
              >
                <Link
                  href={`/marketplace/${event.invoice_id}`}
                  className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted/40"
                  data-testid={`platform-event-link-${event.id}`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${style.className}`}
                    data-testid={`platform-event-icon-${event.type}`}
                    aria-hidden="true"
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-medium"
                      data-testid={`platform-event-description-${event.id}`}
                    >
                      {describePlatformEvent(event)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {event.created_at
                        ? new Date(event.created_at).toLocaleString()
                        : ""}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
