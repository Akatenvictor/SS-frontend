"use client";

/**
 * KYC gating for investing (issue #376)
 *
 * Investing is only offered to wallets whose KYC has been approved. Until the
 * status is known the investor is treated as *not* approved so the invest CTA
 * never flashes into view for someone who cannot use it.
 */

import { useQuery } from "@tanstack/react-query";
import { fetchSellerKycStatus, type SellerKycStatus } from "@/lib/api";
import { useWallet } from "@/context/WalletContext";

export const KYC_STATUS_QUERY_KEY = ["kyc", "status"] as const;

export function useKycStatus(options: { enabled?: boolean } = {}) {
  const { address } = useWallet();
  const { enabled = true } = options;

  return useQuery<SellerKycStatus>({
    queryKey: [...KYC_STATUS_QUERY_KEY, address],
    queryFn: () => fetchSellerKycStatus(),
    // KYC is scoped to the connected wallet, so never cache across wallets.
    enabled: enabled && Boolean(address),
    staleTime: 60 * 1000,
  });
}

/** True only once the API has confirmed this wallet passed KYC. */
export function useIsKycApproved(options: { enabled?: boolean } = {}): {
  isApproved: boolean;
  isLoading: boolean;
  status: SellerKycStatus["status"] | undefined;
} {
  const { data, isLoading } = useKycStatus(options);

  return {
    isApproved: data?.status === "approved",
    isLoading,
    status: data?.status,
  };
}
