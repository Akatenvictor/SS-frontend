"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchProtocolStatus } from "@/lib/api";

export const PROTOCOL_STATUS_QUERY_KEY = ["protocol-status"] as const;

/** Issue #116: the minimum investment floor must be read from GET
 * /protocol/status rather than hardcoded — it's a protocol-wide setting,
 * not tied to any one invoice. */
export function useProtocolStatus() {
  return useQuery({
    queryKey: PROTOCOL_STATUS_QUERY_KEY,
    queryFn: fetchProtocolStatus,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
