"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  addWhitelistAddress,
  fetchKeyWhitelist,
  removeWhitelistAddress,
  updateWhitelistMode,
} from "@/lib/api";
import { creatorKeyQueryKey } from "@/hooks/useCreatorKeys";

export const whitelistQueryKey = (keyId: string) =>
  ["creator-key", keyId, "whitelist-manager"] as const;

export function useKeyWhitelist(keyId: string, token?: string | null) {
  return useInfiniteQuery({
    queryKey: whitelistQueryKey(keyId),
    queryFn: ({ pageParam }) =>
      fetchKeyWhitelist(keyId, pageParam as string | undefined, token ?? undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.next_cursor ?? undefined : undefined,
    enabled: Boolean(keyId),
  });
}

export function useAddWhitelistAddressMutation(keyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      address,
      token,
    }: {
      address: string;
      token?: string | null;
    }) => addWhitelistAddress(keyId, address, token ?? undefined),
    onSuccess: () => {
      toast.success("Address added to whitelist");
      queryClient.invalidateQueries({ queryKey: whitelistQueryKey(keyId) });
    },
    onError: () => {
      toast.error("Failed to add address to whitelist");
    },
  });
}

export function useRemoveWhitelistAddressMutation(keyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      address,
      token,
    }: {
      address: string;
      token?: string | null;
    }) => removeWhitelistAddress(keyId, address, token ?? undefined),
    onSuccess: () => {
      toast.success("Address removed from whitelist");
      queryClient.invalidateQueries({ queryKey: whitelistQueryKey(keyId) });
    },
    onError: () => {
      toast.error("Failed to remove address from whitelist");
    },
  });
}

export function useUpdateWhitelistModeMutation(keyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      enabled,
      token,
    }: {
      enabled: boolean;
      token?: string | null;
    }) => updateWhitelistMode(keyId, enabled, token ?? undefined),
    onSuccess: (result) => {
      toast.success(
        result.whitelist_enabled ? "Whitelist mode enabled" : "Whitelist mode disabled"
      );
      queryClient.invalidateQueries({ queryKey: whitelistQueryKey(keyId) });
      queryClient.invalidateQueries({ queryKey: creatorKeyQueryKey(keyId) });
    },
    onError: () => {
      toast.error("Failed to update whitelist mode");
    },
  });
}
