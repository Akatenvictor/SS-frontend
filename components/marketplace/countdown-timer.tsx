"use client";

import { useEffect, useState } from "react";
import { differenceInSeconds } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface CountdownTimerProps {
  deadline: string | null;
  published: boolean;
}

function formatCountdown(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return `${String(days).padStart(2, "0")}:${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function CountdownTimer({ deadline, published }: CountdownTimerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!deadline || !published) return;

    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [deadline, published]);

  if (!published || !deadline) return null;

  const deadlineMs = new Date(deadline).getTime();
  const remaining = differenceInSeconds(deadlineMs, now);

  if (remaining <= 0) {
    return (
      <Badge variant="destructive" className="text-xs">
        Expired
      </Badge>
    );
  }

  return (
    <span className="font-mono text-sm tabular-nums text-muted-foreground">
      {formatCountdown(remaining)}
    </span>
  );
}

export function isExpired(deadline: string | null): boolean {
  if (!deadline) return false;
  return new Date(deadline).getTime() <= Date.now();
}
