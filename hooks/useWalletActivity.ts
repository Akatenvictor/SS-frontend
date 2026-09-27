"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchWalletActivity } from "@/lib/api";

export const walletActivityQueryKey = (address: string) =>
  ["wallet-activity", address] as const;

export function useWalletActivity(
  address?: string | null,
  token?: string | null
) {
  return useInfiniteQuery({
    queryKey: walletActivityQueryKey(address ?? ""),
    queryFn: ({ pageParam }) =>
      fetchWalletActivity(
        address ?? "",
        pageParam as string | undefined,
        token ?? undefined
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.next_cursor ?? undefined : undefined,
    enabled: Boolean(address),
  });
}
