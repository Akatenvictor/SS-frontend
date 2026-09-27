"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  buyCreatorKey,
  burnCreatorKey,
  castGovernanceVote,
  createGovernanceProposal,
  fetchCreatorKeyDetail,
  fetchKeySupply,
  fetchKeyProposals,
  fetchKeyWhitelistStatus,
  transferCreatorKey,
  updateKeySupplyCap,
  distributeDividend,
  type CreateProposalInput,
} from "@/lib/api";
import { PORTFOLIO_QUERY_KEY } from "@/hooks/usePortfolio";

export const creatorKeyQueryKey = (keyId: string) => ["creator-key", keyId] as const;
export const keySupplyQueryKey = (keyId: string) =>
  ["creator-key", keyId, "supply"] as const;
export const keyProposalsQueryKey = (
  keyId: string,
  status: "active" | "closed"
) => ["creator-key", keyId, "proposals", status] as const;

export function useCreatorKey(keyId: string, token?: string | null) {
  return useQuery({
    queryKey: creatorKeyQueryKey(keyId),
    queryFn: () => fetchCreatorKeyDetail(keyId, token ?? undefined),
  });
}

export function useKeyProposals(
  keyId: string,
  status: "active" | "closed",
  token?: string | null
) {
  return useQuery({
    queryKey: keyProposalsQueryKey(keyId, status),
    queryFn: () => fetchKeyProposals(keyId, status, token ?? undefined),
  });
}

export function useKeyWhitelistStatus(
  keyId: string,
  walletAddress?: string | null,
  token?: string | null
) {
  return useQuery({
    queryKey: ["creator-key", keyId, "whitelist", walletAddress],
    queryFn: () =>
      fetchKeyWhitelistStatus(keyId, walletAddress ?? "", token ?? undefined),
    enabled: Boolean(walletAddress),
  });
}

export function useKeySupply(keyId: string, token?: string | null) {
  return useQuery({
    queryKey: keySupplyQueryKey(keyId),
    queryFn: () => fetchKeySupply(keyId, token ?? undefined),
  });
}

export function useBuyCreatorKeyMutation(keyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      walletAddress,
      token,
    }: {
      walletAddress: string;
      token?: string | null;
    }) => buyCreatorKey(keyId, walletAddress, token ?? undefined),
    onSuccess: () => {
      toast.success("Key purchase submitted");
      queryClient.invalidateQueries({ queryKey: creatorKeyQueryKey(keyId) });
      queryClient.invalidateQueries({ queryKey: keySupplyQueryKey(keyId) });
      queryClient.invalidateQueries({ queryKey: PORTFOLIO_QUERY_KEY });
    },
    onError: () => {
      toast.error("Key purchase failed");
    },
  });
}

export function useCastGovernanceVoteMutation(keyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      proposalId,
      optionIndex,
      walletAddress,
      token,
    }: {
      proposalId: string;
      optionIndex: number;
      walletAddress: string;
      token?: string | null;
    }) =>
      castGovernanceVote(
        keyId,
        proposalId,
        optionIndex,
        walletAddress,
        token ?? undefined
      ),
    onSuccess: () => {
      toast.success("Your vote has been recorded");
      queryClient.invalidateQueries({ queryKey: keyProposalsQueryKey(keyId, "active") });
      queryClient.invalidateQueries({ queryKey: keyProposalsQueryKey(keyId, "closed") });
    },
    onError: () => {
      toast.error("Vote submission failed");
    },
  });
}

export function useBurnCreatorKeyMutation(keyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      quantity,
      walletAddress,
      token,
    }: {
      quantity: number;
      walletAddress: string;
      token?: string | null;
    }) => burnCreatorKey(keyId, quantity, walletAddress, token ?? undefined),
    onSuccess: (result) => {
      toast.success(
        result.circulatingSupply === null
          ? "Key burned successfully"
          : `Key burned successfully. New circulating supply: ${result.circulatingSupply.toLocaleString()}`
      );
      queryClient.invalidateQueries({ queryKey: creatorKeyQueryKey(keyId) });
      queryClient.invalidateQueries({ queryKey: keySupplyQueryKey(keyId) });
      queryClient.invalidateQueries({ queryKey: PORTFOLIO_QUERY_KEY });
    },
    onError: () => {
      toast.error("Key burn failed");
    },
  });
}

export function useCreateProposalMutation(keyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      input,
      walletAddress,
      token,
    }: {
      input: CreateProposalInput;
      walletAddress: string;
      token?: string | null;
    }) => createGovernanceProposal(keyId, input, walletAddress, token ?? undefined),
    onSuccess: () => {
      toast.success("Proposal created");
      queryClient.invalidateQueries({ queryKey: keyProposalsQueryKey(keyId, "active") });
    },
    onError: () => {
      toast.error("Failed to create proposal");
    },
  });
}

export function useTransferCreatorKeyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      keyId,
      recipient,
      quantity,
      walletAddress,
      token,
    }: {
      keyId: string;
      recipient: string;
      quantity: number;
      walletAddress: string;
      token?: string | null;
    }) =>
      transferCreatorKey(
        keyId,
        recipient,
        quantity,
        walletAddress,
        token ?? undefined
      ),
    onSuccess: () => {
      toast.success("Key transfer confirmed");
      queryClient.invalidateQueries({ queryKey: PORTFOLIO_QUERY_KEY });
    },
    onError: () => {
      toast.error("Key transfer failed");
    },
  });
}

export function useUpdateSupplyCapMutation(keyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      supplyCap,
      token,
    }: {
      supplyCap: number;
      token?: string | null;
    }) => updateKeySupplyCap(keyId, supplyCap, token ?? undefined),
    onSuccess: () => {
      toast.success("Supply cap updated");
      queryClient.invalidateQueries({ queryKey: keySupplyQueryKey(keyId) });
      queryClient.invalidateQueries({ queryKey: creatorKeyQueryKey(keyId) });
    },
  });
}

export function useDistributeDividendMutation(keyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      amount,
      walletAddress,
      token,
    }: {
      amount: number;
      walletAddress: string;
      token?: string | null;
    }) => distributeDividend(keyId, amount, walletAddress, token ?? undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: creatorKeyQueryKey(keyId) });
      queryClient.invalidateQueries({ queryKey: PORTFOLIO_QUERY_KEY });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Dividend distribution failed"
      );
    },
  });
}
