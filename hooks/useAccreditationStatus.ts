"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAccreditationStatus, isAccreditedForInvoice, type AccreditationStatus, type AccreditationTier } from "@/lib/api";
import { useWallet } from "@/context/WalletContext";

export const ACCREDITATION_QUERY_KEY = ["accreditation"] as const;

export function useAccreditationStatus(options: { enabled?: boolean } = {}) {
  const { address } = useWallet();
  const { enabled = true } = options;

  return useQuery<AccreditationStatus>({
    queryKey: [...ACCREDITATION_QUERY_KEY, address],
    queryFn: () => fetchAccreditationStatus(address!),
    enabled: enabled && Boolean(address),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useCanInvestInInvoice(faceValue: number): {
  canInvest: boolean;
  isLoading: boolean;
  tier: AccreditationTier | undefined;
  threshold: number;
} {
  const { isConnected } = useWallet();
  const { data, isLoading } = useAccreditationStatus({ enabled: isConnected });

  const tier = data?.tier;
  const threshold = data?.high_value_threshold ?? 100_000;

  return {
    canInvest: isLoading ? false : !data || isAccreditedForInvoice(data.tier, faceValue, threshold),
    isLoading,
    tier,
    threshold,
  };
}
