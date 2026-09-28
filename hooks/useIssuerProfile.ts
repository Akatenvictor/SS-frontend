"use client";

import { useQuery } from "@tanstack/react-query";
import { ApiNotFoundError, fetchIssuerProfile } from "@/lib/api";

export const ISSUER_PROFILE_STALE_TIME = 5 * 60 * 1000;

export const issuerProfileQueryKey = (id: string) => ["issuer", id] as const;

/**
 * Loads a public issuer profile. A 404 is a real answer ("no such issuer"), so
 * it is not retried and is surfaced as `isNotFound` for the 404 state.
 */
export function useIssuerProfile(id: string | undefined) {
  const query = useQuery({
    queryKey: issuerProfileQueryKey(id ?? ""),
    queryFn: () => fetchIssuerProfile(id as string),
    enabled: Boolean(id),
    staleTime: ISSUER_PROFILE_STALE_TIME,
    retry: (failureCount, error) =>
      !(error instanceof ApiNotFoundError) && failureCount < 2,
  });

  return {
    ...query,
    isNotFound: query.error instanceof ApiNotFoundError,
  };
}
