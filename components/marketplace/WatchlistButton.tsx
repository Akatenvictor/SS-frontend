"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWatchlist } from "@/hooks/useWatchlist";

interface WatchlistButtonProps {
  invoiceId: string;
  className?: string;
}

export function WatchlistButton({ invoiceId, className }: WatchlistButtonProps) {
  const { toggle, isBookmarked, isPending } = useWatchlist();
  const bookmarked = isBookmarked(invoiceId);

  return (
    <Button
      variant={bookmarked ? "default" : "outline"}
      size="icon"
      onClick={() => toggle(invoiceId)}
      disabled={isPending}
      className={className}
      aria-label={bookmarked ? "Remove from watchlist" : "Add to watchlist"}
    >
      {bookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
    </Button>
  );
}