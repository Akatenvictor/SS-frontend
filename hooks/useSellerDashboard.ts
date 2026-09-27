"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchSellerDashboard, fetchSellerKycStatus } from "@/lib/api";

export const SELLER_DASHBOARD_QUERY_KEY = ["seller-dashboard"] as const;
export const SELLER_KYC_STATUS_QUERY_KEY = ["seller-kyc-status"] as const;

export function useSellerDashboard() {
  return useQuery({
    queryKey: SELLER_DASHBOARD_QUERY_KEY,
    queryFn: fetchSellerDashboard,
    staleTime: 60 * 1000, // 60 seconds - serve cached data without skeleton on repeat visits
    gcTime: 5 * 60 * 1000, // 5 minutes - keep data in memory for garbage collection
  });
}

export function useSellerKycStatus() {
  return useQuery({
    queryKey: SELLER_KYC_STATUS_QUERY_KEY,
    queryFn: () => fetchSellerKycStatus(),
    refetchInterval: 30 * 1000,
  });
}
