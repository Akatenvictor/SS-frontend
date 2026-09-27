"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  cancelTimelockProposal,
  executeTimelockProposal,
  fetchTimelockProposals,
} from "@/lib/api";

export const timelockProposalsQueryKey = ["admin", "timelock", "proposals"] as const;

export function useTimelockProposals(token?: string | null) {
  return useQuery({
    queryKey: timelockProposalsQueryKey,
    queryFn: () => fetchTimelockProposals(token ?? undefined),
  });
}

export function useExecuteTimelockProposalMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      proposalId,
      token,
    }: {
      proposalId: string;
      token?: string | null;
    }) => executeTimelockProposal(proposalId, token ?? undefined),
    onSuccess: () => {
      toast.success("Proposal executed");
      queryClient.invalidateQueries({ queryKey: timelockProposalsQueryKey });
    },
    onError: () => {
      toast.error("Failed to execute proposal");
    },
  });
}

export function useCancelTimelockProposalMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      proposalId,
      token,
    }: {
      proposalId: string;
      token?: string | null;
    }) => cancelTimelockProposal(proposalId, token ?? undefined),
    onSuccess: () => {
      toast.success("Proposal cancelled");
      queryClient.invalidateQueries({ queryKey: timelockProposalsQueryKey });
    },
    onError: () => {
      toast.error("Failed to cancel proposal");
    },
  });
}
