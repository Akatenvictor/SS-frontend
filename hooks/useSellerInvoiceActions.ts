"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteDraftInvoice, submitDraftInvoice } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { SELLER_DASHBOARD_QUERY_KEY } from "@/hooks/useSellerDashboard";

/** Submit a draft for review, refreshing the dashboard on success. */
export function useSubmitDraftInvoice() {
  const queryClient = useQueryClient();
  const { jwt } = useAuth();

  return useMutation({
    mutationFn: (id: string) => submitDraftInvoice(id, jwt ?? undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SELLER_DASHBOARD_QUERY_KEY });
    },
  });
}

/** Delete a draft, refreshing the dashboard on success. */
export function useDeleteDraftInvoice() {
  const queryClient = useQueryClient();
  const { jwt } = useAuth();

  return useMutation({
    mutationFn: (id: string) => deleteDraftInvoice(id, jwt ?? undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SELLER_DASHBOARD_QUERY_KEY });
    },
  });
}
