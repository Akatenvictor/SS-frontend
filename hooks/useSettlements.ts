"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PORTFOLIO_QUERY_KEY } from "./usePortfolio";
import { useCurrency } from "./useCurrency";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface ClaimableSettlement {
  invoice_id: string;
  invoice_title: string;
  invested_amount: number;
  return_amount: number;
  net_profit: number;
  settled_at: string;
  tx_hash?: string;
}

export interface ClaimedHistory {
  invoice_id: string;
  invoice_title: string;
  invested_amount: number;
  claimed_amount: number;
  claimed_at: string;
  tx_hash: string;
}

export interface SettlementResponse {
  claimable: ClaimableSettlement[];
  claimed_history: ClaimedHistory[];
  total_claimable: number;
  total_claimed: number;
}

async function fetchSettlements(): Promise<SettlementResponse> {
  const res = await fetch(`${API_BASE}/investor/settlements`);
  if (!res.ok) throw new Error("Failed to fetch settlements");
  return res.json();
}

async function claimSettlement(invoiceId: string): Promise<{ tx_hash: string }> {
  const res = await fetch(`${API_BASE}/investor/settlements/${invoiceId}/claim`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to claim settlement");
  return res.json();
}

async function batchClaimSettlements(invoiceIds: string[]): Promise<{ tx_hashes: string[] }> {
  const res = await fetch(`${API_BASE}/investor/settlements/batch-claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invoice_ids: invoiceIds }),
  });
  if (!res.ok) throw new Error("Failed to batch claim settlements");
  return res.json();
}

export function useSettlements() {
  return useQuery({
    queryKey: ["settlements"],
    queryFn: fetchSettlements,
    staleTime: 30_000,
  });
}

export function useClaimSettlement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: claimSettlement,
    onSuccess: (_data, invoiceId) => {
      toast.success("Settlement claimed successfully");
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
      queryClient.invalidateQueries({ queryKey: PORTFOLIO_QUERY_KEY });
    },
    onError: () => {
      toast.error("Failed to claim settlement");
    },
  });
}

export function useBatchClaimSettlement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: batchClaimSettlements,
    onSuccess: () => {
      toast.success("All settlements claimed successfully");
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
      queryClient.invalidateQueries({ queryKey: PORTFOLIO_QUERY_KEY });
    },
    onError: () => {
      toast.error("Failed to batch claim settlements");
    },
  });
}
