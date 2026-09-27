"use client";

import { useEffect, useState } from "react";
import { differenceInSeconds } from "date-fns";

interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
}

export function useCountdown(deadline: string | null, published: boolean): CountdownResult {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!deadline || !published) return;

    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [deadline, published]);

  if (!published || !deadline) {
    return { days: 0, hours: 0, minutes: 0 };
  }

  const deadlineMs = new Date(deadline).getTime();
  const remaining = differenceInSeconds(deadlineMs, now);

  if (remaining <= 0) {
    return { days: 0, hours: 0, minutes: 0 };
  }

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);

  return { days, hours, minutes };
}
