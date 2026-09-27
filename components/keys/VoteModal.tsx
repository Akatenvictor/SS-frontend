"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { GovernanceProposal } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useCastGovernanceVoteMutation } from "@/hooks/useCreatorKeys";

interface VoteModalProps {
  keyId: string;
  proposal: GovernanceProposal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VoteModal({
  keyId,
  proposal,
  open,
  onOpenChange,
}: VoteModalProps) {
  const { address, jwt } = useAuth();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [recorded, setRecorded] = useState(false);
  const voteMutation = useCastGovernanceVoteMutation(keyId);

  useEffect(() => {
    if (open) {
      setSelectedOption(null);
      setRecorded(Boolean(proposal?.user_has_voted));
    }
  }, [open, proposal]);

  if (!open || !proposal) return null;

  const votingWeight = proposal.user_voting_weight ?? 0;
  const canSubmit =
    selectedOption !== null &&
    Boolean(address) &&
    !voteMutation.isPending &&
    !recorded;

  const handleSubmit = async () => {
    if (!address || selectedOption === null) return;
    try {
      await voteMutation.mutateAsync({
        proposalId: proposal.id,
        optionIndex: selectedOption,
        walletAddress: address,
        token: jwt,
      });
      setRecorded(true);
    } catch {
      // react-query exposes the rejection as voteMutation.error so the error
      // message below can be rendered; nothing else to do here.
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Cast Vote</p>
              <h2 className="text-xl font-semibold">{proposal.title}</h2>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label="Close vote modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-3">
            {proposal.options.map((option, index) => (
              <label
                key={`${proposal.id}-${option.label}`}
                className="flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm"
              >
                <input
                  type="radio"
                  name={`proposal-${proposal.id}`}
                  value={index}
                  checked={selectedOption === index}
                  onChange={() => setSelectedOption(index)}
                  disabled={recorded || voteMutation.isPending}
                  className="h-4 w-4"
                />
                <span className="font-medium">{option.label}</span>
              </label>
            ))}
          </div>

          <div className="rounded-md bg-muted p-3 text-sm">
            <span className="text-muted-foreground">Your snapshot voting weight: </span>
            <span className="font-semibold">{votingWeight.toLocaleString()}</span>
          </div>

          {recorded && (
            <p className="text-sm font-medium text-emerald-600">
              Your vote has been recorded
            </p>
          )}

          {voteMutation.isError && (
            <p
              data-testid="vote-error-message"
              className="text-sm font-medium text-red-600"
            >
              {voteMutation.error instanceof Error
                ? voteMutation.error.message
                : "Vote submission failed. Please try again."}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={voteMutation.isPending}
            >
              Close
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
              {voteMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {voteMutation.isPending ? "Signing..." : "Confirm Vote"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
