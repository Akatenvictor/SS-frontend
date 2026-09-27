"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EyeOff, ExternalLink } from "lucide-react";

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

export default function WatchlistPage() {
  const [watchedIds, setWatchedIds] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setWatchedIds(getWatchlist());
    setMounted(true);
  }, []);

  const removeInvoice = (id: string) => {
    const next = watchedIds.filter((wid) => wid !== id);
    setWatchedIds(next);
    saveWatchlist(next);
  };

  if (!mounted) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Watchlist</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Watchlist</h1>

      {watchedIds.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No invoices in your watchlist yet.
            </p>
            <Link
              href="/marketplace"
              className="text-primary hover:underline text-sm mt-2 inline-block"
            >
              Browse the marketplace to find invoices to watch
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {watchedIds.map((id) => (
            <Card key={id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-mono shrink-0">
                    {id.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-sm truncate">{id}</p>
                    <p className="text-xs text-muted-foreground">
                      Added to watchlist
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/marketplace/${id}`}>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeInvoice(id)}
                    aria-label="Remove from watchlist"
                  >
                    <EyeOff className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
