"use client";

import { useState, useEffect, useCallback } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const WATCHLIST_KEY = "stellarsettle:watchlist";

function getWatchlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(WATCHLIST_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveWatchlist(ids: string[]): void {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(ids));
}

interface WatchlistButtonProps {
  invoiceId: string;
  className?: string;
}

export function WatchlistButton({ invoiceId, className }: WatchlistButtonProps) {
  const [watched, setWatched] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setWatched(getWatchlist().includes(invoiceId));
    setMounted(true);
  }, [invoiceId]);

  const toggle = useCallback(() => {
    setWatched((prev) => {
      const list = getWatchlist();
      const next = !prev;
      if (next) {
        if (!list.includes(invoiceId)) list.push(invoiceId);
      } else {
        const idx = list.indexOf(invoiceId);
        if (idx !== -1) list.splice(idx, 1);
      }
      saveWatchlist(list);
      return next;
    });
  }, [invoiceId]);

  if (!mounted) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      aria-label={watched ? "Remove from watchlist" : "Add to watchlist"}
      className={className}
    >
      {watched ? (
        <EyeOff className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Eye className="h-4 w-4" aria-hidden="true" />
      )}
      <span className="ml-1.5 text-sm">{watched ? "Watching" : "Watch"}</span>
    </Button>
  );
}
