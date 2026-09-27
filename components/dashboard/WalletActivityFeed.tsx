"use client";

import { useCallback, useMemo, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  Coins,
  Flame,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useWalletActivity } from "@/hooks/useWalletActivity";
import type { WalletActivityEvent, WalletActivityType } from "@/lib/api";

interface ActivityTypeStyle {
  icon: LucideIcon;
  label: string;
  /** Tailwind classes for the icon badge — one distinct colour per event type. */
  className: string;
}

const ACTIVITY_TYPE_STYLES: Record<WalletActivityType, ActivityTypeStyle> = {
  buy: {
    icon: ArrowUpRight,
    label: "Bought",
    className: "bg-green-100 text-green-700",
  },
  sell: {
    icon: ArrowDownRight,
    label: "Sold",
    className: "bg-red-100 text-red-700",
  },
  transfer: {
    icon: ArrowLeftRight,
    label: "Transferred",
    className: "bg-blue-100 text-blue-700",
  },
  burn: {
    icon: Flame,
    label: "Burned",
    className: "bg-orange-100 text-orange-700",
  },
  dividend: {
    icon: Coins,
    label: "Dividend from",
    className: "bg-yellow-100 text-yellow-700",
  },
};

function formatAmount(amount: number): string {
  return amount.toLocaleString(undefined, { maximumFractionDigits: 7 });
}

export function describeActivity(event: WalletActivityEvent): string {
  const amount = formatAmount(event.amount);
  const style = ACTIVITY_TYPE_STYLES[event.type];

  if (event.type === "dividend") {
    return `Dividend of ${amount} XLM from ${event.keyName}`;
  }

  const unit = event.amount === 1 ? "key" : "keys";
  return `${style.label} ${amount} ${event.keyName} ${unit}`;
}

function formatTimestamp(createdAt: string): { relative: string; absolute: string } {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return { relative: "—", absolute: "" };
  }
  return {
    relative: formatDistanceToNow(date, { addSuffix: true }),
    absolute: date.toLocaleString(),
  };
}

interface WalletActivityFeedProps {
  address?: string | null;
}

export function WalletActivityFeed({ address }: WalletActivityFeedProps) {
  const { address: authAddress, jwt } = useAuth();
  const walletAddress = address ?? authAddress;

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useWalletActivity(walletAddress, jwt);

  const events = useMemo(
    () => data?.pages.flatMap((page) => page.events) ?? [],
    [data]
  );

  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleIntersect = useCallback(
    (observerEntries: IntersectionObserverEntry[]) => {
      if (observerEntries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  const observer = useMemo(() => {
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
      return null;
    }
    return new IntersectionObserver(handleIntersect, { rootMargin: "200px" });
  }, [handleIntersect]);

  const sentinelRefCallback = useCallback(
    (node: HTMLDivElement | null) => {
      if (observer) {
        if (sentinelRef.current) observer.unobserve(sentinelRef.current);
        if (node) observer.observe(node);
      }
      sentinelRef.current = node;
    },
    [observer]
  );

  if (isLoading) {
    return (
      <div className="space-y-2" data-testid="wallet-activity-loading">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardContent
          className="py-12 text-center text-sm text-muted-foreground"
          data-testid="wallet-activity-empty"
        >
          No activity yet
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="wallet-activity-feed">
      <ol className="space-y-3">
        {events.map((event) => {
          const style = ACTIVITY_TYPE_STYLES[event.type];
          const Icon = style.icon;
          const { relative, absolute } = formatTimestamp(event.createdAt);

          return (
            <li key={event.id} data-testid={`activity-row-${event.id}`}>
              <Card>
                <CardContent className="flex items-center gap-4 py-4">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${style.className}`}
                    data-testid={`activity-icon-${event.type}`}
                    aria-hidden="true"
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-medium"
                      data-testid={`activity-description-${event.id}`}
                    >
                      {describeActivity(event)}
                    </p>
                    <p
                      className="text-xs text-muted-foreground"
                      title={absolute}
                      data-testid={`activity-timestamp-${event.id}`}
                    >
                      {relative}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold">
                    {formatAmount(event.amount)}
                  </span>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ol>

      <div ref={sentinelRefCallback} data-testid="wallet-activity-sentinel" />

      {isFetchingNextPage && (
        <Skeleton className="h-16 w-full" data-testid="wallet-activity-loading-more" />
      )}
    </div>
  );
}
