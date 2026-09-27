"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useInvoiceRating,
  useSubmitInvoiceRatingMutation,
} from "@/hooks/useInvoiceRating";
import { cn } from "@/lib/utils";

interface InvoiceRatingWidgetProps {
  invoiceId: string;
  /** Only wallets with a qualifying investment may rate. */
  isEligible: boolean;
  walletAddress?: string | null;
  token?: string | null;
}

/**
 * Star rating widget for invoice detail pages (issue #348).
 * Visible only to qualifying investors; shows aggregate rating + count,
 * pre-fills the wallet's prior rating and uses optimistic updates with
 * rollback on error.
 */
export function InvoiceRatingWidget({
  invoiceId,
  isEligible,
  walletAddress,
  token,
}: InvoiceRatingWidgetProps) {
  const { data, isLoading } = useInvoiceRating(invoiceId);
  const submitMutation = useSubmitInvoiceRatingMutation(invoiceId);
  const [selected, setSelected] = useState<number | null>(null);

  // Pre-fill prior rating for returning raters.
  useEffect(() => {
    if (data?.user_rating !== null && data?.user_rating !== undefined) {
      setSelected(data.user_rating);
    }
  }, [data?.user_rating]);

  if (!isEligible) return null;

  if (isLoading || !data) {
    return (
      <Card data-testid="rating-widget-loading">
        <CardContent className="pt-6">
          <Skeleton className="h-6 w-40" />
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = () => {
    if (selected === null || selected < 1 || selected > 5) return;
    submitMutation.mutate({
      rating: selected,
      walletAddress: walletAddress ?? undefined,
      token,
    });
  };

  return (
    <Card data-testid="rating-widget">
      <CardHeader>
        <h2 className="text-lg font-semibold">Rate this invoice</h2>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold" data-testid="aggregate-rating">
            {data.average_rating.toFixed(1)}
          </span>
          <span className="text-sm text-muted-foreground">/ 5</span>
          <span className="text-sm text-muted-foreground" data-testid="rating-count">
            ({data.rating_count} {data.rating_count === 1 ? "rating" : "ratings"})
          </span>
        </div>

        <div className="flex items-center gap-1" role="radiogroup" aria-label="Star rating">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={selected === star}
              aria-label={`Rate ${star} star${star !== 1 ? "s" : ""}`}
              data-testid={`rating-star-${star}`}
              onClick={() => setSelected(star)}
              className="rounded p-1 transition-colors hover:bg-muted"
            >
              <Star
                className={cn(
                  "h-6 w-6",
                  selected !== null && star <= selected
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground"
                )}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>

        {selected !== null && (
          <p className="text-xs text-muted-foreground" data-testid="rating-selected">
            Your rating: {selected} star{selected !== 1 ? "s" : ""}
          </p>
        )}

        <Button
          onClick={handleSubmit}
          disabled={selected === null || submitMutation.isPending}
          data-testid="rating-submit"
        >
          {submitMutation.isPending ? "Submitting..." : "Submit rating"}
        </Button>
      </CardContent>
    </Card>
  );
}
