"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  fetchInvoiceRating,
  submitInvoiceRating,
  type InvoiceRatingSummary,
} from "@/lib/api";

export const invoiceRatingQueryKey = (invoiceId: string) =>
  ["invoice", invoiceId, "rating"] as const;

export function useInvoiceRating(invoiceId: string) {
  return useQuery({
    queryKey: invoiceRatingQueryKey(invoiceId),
    queryFn: () => fetchInvoiceRating(invoiceId),
  });
}

interface SubmitRatingVars {
  rating: number;
  walletAddress?: string;
  token?: string | null;
}

/**
 * Submits a 1-5 star rating with optimistic update + rollback (issue #348).
 */
export function useSubmitInvoiceRatingMutation(invoiceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ rating, walletAddress, token }: SubmitRatingVars) =>
      submitInvoiceRating(invoiceId, rating, walletAddress, token ?? undefined),

    onMutate: async ({ rating }) => {
      await queryClient.cancelQueries({ queryKey: invoiceRatingQueryKey(invoiceId) });
      const previous =
        queryClient.getQueryData<InvoiceRatingSummary>(invoiceRatingQueryKey(invoiceId));

      if (previous) {
        const prevCount = previous.rating_count;
        const prevAvg = previous.average_rating;
        const hadPrior = previous.user_rating !== null && previous.user_rating !== undefined;
        // Optimistic aggregate: adjust count only for first-time raters.
        const nextCount = hadPrior ? prevCount : prevCount + 1;
        const prevTotal = prevAvg * prevCount;
        const adjustment = hadPrior ? (previous.user_rating as number) : 0;
        const nextAvg =
          nextCount > 0 ? (prevTotal - adjustment + rating) / nextCount : rating;
        queryClient.setQueryData<InvoiceRatingSummary>(
          invoiceRatingQueryKey(invoiceId),
          { ...previous, average_rating: nextAvg, rating_count: nextCount, user_rating: rating }
        );
      }

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(invoiceRatingQueryKey(invoiceId), context.previous);
      }
      toast.error("Rating submission failed");
    },

    onSuccess: (data) => {
      queryClient.setQueryData(invoiceRatingQueryKey(invoiceId), data);
      toast.success("Rating submitted");
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: invoiceRatingQueryKey(invoiceId) });
    },
  });
}

/**
 * Local draft hook kept for testability: tracks selected stars before submit.
 */
export function useRatingDraft(initial: number | null) {
  const [draft, setDraft] = useState<number | null>(initial);
  return { draft, setDraft };
}
