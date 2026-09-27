"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCreatorRevenue } from "@/lib/api";

export const creatorRevenueQueryKey = (keyId: string) =>
  ["creator-key", keyId, "revenue"] as const;

export function useCreatorRevenue(keyId: string, token?: string | null) {
  return useQuery({
    queryKey: creatorRevenueQueryKey(keyId),
    queryFn: () => fetchCreatorRevenue(keyId, token ?? undefined),
  });
}
