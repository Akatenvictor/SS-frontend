"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  approveKeyPause,
  fetchAdminKeyControls,
  proposeKeyPause,
} from "@/lib/api";

export const adminKeyControlsQueryKey = ["admin-key-controls"] as const;

export function useAdminKeyControls(token?: string | null) {
  return useQuery({
    queryKey: adminKeyControlsQueryKey,
    queryFn: () => fetchAdminKeyControls(token ?? undefined),
  });
}

export function useProposePauseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ keyId, token }: { keyId: string; token?: string | null }) =>
      proposeKeyPause(keyId, token ?? undefined),
    onSuccess: () => {
      toast.success("Pause proposed — awaiting a second admin approval");
      queryClient.invalidateQueries({ queryKey: adminKeyControlsQueryKey });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to propose pause");
    },
  });
}

export function useApprovePauseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ keyId, token }: { keyId: string; token?: string | null }) =>
      approveKeyPause(keyId, token ?? undefined),
    onSuccess: () => {
      toast.success("Trading paused");
      queryClient.invalidateQueries({ queryKey: adminKeyControlsQueryKey });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to approve pause");
    },
  });
}
