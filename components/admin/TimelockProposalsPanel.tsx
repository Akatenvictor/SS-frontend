"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import {
  useCancelTimelockProposalMutation,
  useExecuteTimelockProposalMutation,
  useTimelockProposals,
} from "@/hooks/useTimelockProposals";
import type { TimelockProposal } from "@/lib/api";

function formatDateTime(value: string): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function summarizePayload(payload: Record<string, unknown>): string {
  const entries = Object.entries(payload ?? {});
  if (entries.length === 0) return "No payload";
  return entries
    .map(([key, value]) => `${key}: ${formatPayloadValue(value)}`)
    .join(", ");
}

function formatPayloadValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatRemaining(msRemaining: number): string {
  const totalSeconds = Math.max(Math.floor(msRemaining / 1000), 0);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  return now;
}

interface PendingProposalRowProps {
  proposal: TimelockProposal;
  now: number;
  onExecute: (proposal: TimelockProposal) => void;
  onCancel: (proposal: TimelockProposal) => void;
  isExecuting: boolean;
  isCancelling: boolean;
}

function PendingProposalRow({
  proposal,
  now,
  onExecute,
  onCancel,
  isExecuting,
  isCancelling,
}: PendingProposalRowProps) {
  const executionTime = new Date(proposal.executionNotBefore).getTime();
  const isExecutable =
    !Number.isNaN(executionTime) && now >= executionTime;
  const msRemaining = executionTime - now;

  return (
    <div
      className="space-y-3 rounded-md border p-4"
      data-testid={`timelock-proposal-${proposal.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p
            className="font-semibold"
            data-testid={`timelock-change-type-${proposal.id}`}
          >
            {proposal.changeType}
          </p>
          <p
            className="break-words text-sm text-muted-foreground"
            data-testid={`timelock-payload-${proposal.id}`}
          >
            {summarizePayload(proposal.payload)}
          </p>
        </div>
        {isExecutable ? (
          <Badge data-testid={`timelock-ready-${proposal.id}`}>Ready</Badge>
        ) : (
          <Badge variant="secondary" data-testid={`timelock-countdown-${proposal.id}`}>
            Executable in {formatRemaining(msRemaining)}
          </Badge>
        )}
      </div>

      <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <span data-testid={`timelock-proposed-at-${proposal.id}`}>
          Proposed {formatDateTime(proposal.proposedAt)}
        </span>
        <span data-testid={`timelock-not-before-${proposal.id}`}>
          Executable from {formatDateTime(proposal.executionNotBefore)}
        </span>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          size="sm"
          onClick={() => onExecute(proposal)}
          disabled={!isExecutable || isExecuting || isCancelling}
          data-testid={`timelock-execute-${proposal.id}`}
        >
          {isExecuting && <Loader2 className="h-4 w-4 animate-spin" />}
          Execute
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onCancel(proposal)}
          disabled={isExecuting || isCancelling}
          data-testid={`timelock-cancel-${proposal.id}`}
        >
          {isCancelling && <Loader2 className="h-4 w-4 animate-spin" />}
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function TimelockProposalsPanel() {
  const { jwt } = useAuth();
  const proposalsQuery = useTimelockProposals(jwt);
  const executeMutation = useExecuteTimelockProposalMutation();
  const cancelMutation = useCancelTimelockProposalMutation();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const proposals = proposalsQuery.data?.proposals ?? [];
  const pending = proposals.filter((proposal) => proposal.status === "pending");
  const completed = proposals.filter(
    (proposal) => proposal.status === "executed"
  );

  const now = useNow(pending.length > 0);

  const handleExecute = (proposal: TimelockProposal) => {
    executeMutation.mutate({ proposalId: proposal.id, token: jwt });
  };

  const handleCancelConfirmed = (proposal: TimelockProposal) => {
    setConfirmingId(null);
    cancelMutation.mutate({ proposalId: proposal.id, token: jwt });
  };

  if (proposalsQuery.isLoading) {
    return (
      <Card data-testid="timelock-proposals-loading">
        <CardHeader>
          <h2 className="text-lg font-semibold">Timelock Proposals</h2>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const confirmingProposal =
    pending.find((proposal) => proposal.id === confirmingId) ?? null;

  return (
    <Card data-testid="timelock-proposals-panel">
      <CardHeader>
        <h2 className="text-lg font-semibold">Timelock Proposals</h2>
        <p className="text-sm text-muted-foreground">
          Pending configuration changes and their execution windows.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Pending</h3>
          {pending.length === 0 ? (
            <p
              className="text-sm text-muted-foreground"
              data-testid="timelock-pending-empty"
            >
              No pending proposals
            </p>
          ) : (
            pending.map((proposal) => (
              <PendingProposalRow
                key={proposal.id}
                proposal={proposal}
                now={now}
                onExecute={handleExecute}
                onCancel={(target) => setConfirmingId(target.id)}
                isExecuting={
                  executeMutation.isPending &&
                  executeMutation.variables?.proposalId === proposal.id
                }
                isCancelling={
                  cancelMutation.isPending &&
                  cancelMutation.variables?.proposalId === proposal.id
                }
              />
            ))
          )}
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Completed</h3>
          {completed.length === 0 ? (
            <p
              className="text-sm text-muted-foreground"
              data-testid="timelock-completed-empty"
            >
              No completed proposals
            </p>
          ) : (
            <div className="space-y-2" data-testid="timelock-completed-list">
              {completed.map((proposal) => (
                <div
                  key={proposal.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm"
                  data-testid={`timelock-completed-${proposal.id}`}
                >
                  <span className="font-medium">{proposal.changeType}</span>
                  <span className="text-xs text-muted-foreground">
                    Executed {formatDateTime(proposal.executedAt ?? "")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </CardContent>

      {confirmingProposal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <Card className="w-full max-w-md">
            <CardHeader>
              <h3 className="text-lg font-semibold">Cancel proposal?</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This permanently cancels the{" "}
                <span className="font-medium text-foreground">
                  {confirmingProposal.changeType}
                </span>{" "}
                proposal. This cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmingId(null)}
                  data-testid="timelock-cancel-dismiss"
                >
                  Keep proposal
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => handleCancelConfirmed(confirmingProposal)}
                  data-testid="timelock-cancel-confirm"
                >
                  Cancel proposal
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Card>
  );
}
