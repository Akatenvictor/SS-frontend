"use client";

import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import {
  useAdminKeyControls,
  useApprovePauseMutation,
  useProposePauseMutation,
} from "@/hooks/useTradingPause";
import { truncateAddress } from "@/lib/stellar";
import type { AdminKeyControl } from "@/lib/api";

interface TradingControlRowProps {
  control: AdminKeyControl;
  adminAddress: string | null;
  onPropose: (keyId: string) => void;
  onApprove: (keyId: string) => void;
  isProposing: boolean;
  isApproving: boolean;
}

function TradingControlRow({
  control,
  adminAddress,
  onPropose,
  onApprove,
  isProposing,
  isApproving,
}: TradingControlRowProps) {
  const isPaused = control.tradingStatus === "paused";
  const proposal = control.pendingProposal;
  const hasPendingProposal = control.tradingStatus === "pause_pending" && Boolean(proposal);
  const isOwnProposal =
    Boolean(adminAddress) && proposal?.proposedBy === adminAddress;

  return (
    <Card data-testid={`trading-control-${control.keyId}`}>
      <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="truncate font-semibold">{control.keyTitle}</p>
          <div className="flex flex-wrap items-center gap-2">
            {isPaused && (
              <Badge
                variant="destructive"
                data-testid={`trading-paused-badge-${control.keyId}`}
              >
                Trading Paused
              </Badge>
            )}
            {hasPendingProposal && (
              <Badge
                variant="secondary"
                data-testid={`pause-pending-badge-${control.keyId}`}
              >
                Pause proposal pending
              </Badge>
            )}
            {hasPendingProposal && proposal?.proposedBy && (
              <span className="text-xs text-muted-foreground">
                Proposed by {truncateAddress(proposal.proposedBy)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isPaused && !hasPendingProposal && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onPropose(control.keyId)}
              disabled={isProposing}
              data-testid={`propose-pause-${control.keyId}`}
            >
              {isProposing && <Loader2 className="h-4 w-4 animate-spin" />}
              Propose Pause
            </Button>
          )}

          {hasPendingProposal && (
            <>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => onApprove(control.keyId)}
                disabled={isOwnProposal || isApproving}
                data-testid={`approve-pause-${control.keyId}`}
              >
                {isApproving && <Loader2 className="h-4 w-4 animate-spin" />}
                Approve Pause
              </Button>
              {isOwnProposal && (
                <span
                  className="text-xs text-muted-foreground"
                  data-testid={`own-proposal-notice-${control.keyId}`}
                >
                  You proposed this pause — a second admin must approve it
                </span>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function TradingControlsPanel() {
  const { address, jwt } = useAuth();
  const { data, isLoading } = useAdminKeyControls(jwt);
  const proposeMutation = useProposePauseMutation();
  const approveMutation = useApprovePauseMutation();

  const controls = data?.keys ?? [];

  return (
    <div className="space-y-4" data-testid="trading-controls-panel">
      <h2 className="text-lg font-semibold">Trading Controls</h2>

      {isLoading ? (
        <div className="space-y-2" data-testid="trading-controls-loading">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : controls.length === 0 ? (
        <Card>
          <CardContent
            className="py-10 text-center text-sm text-muted-foreground"
            data-testid="trading-controls-empty"
          >
            No keys available for trading controls.
          </CardContent>
        </Card>
      ) : (
        controls.map((control) => (
          <TradingControlRow
            key={control.keyId}
            control={control}
            adminAddress={address}
            onPropose={(keyId) => proposeMutation.mutate({ keyId, token: jwt })}
            onApprove={(keyId) => approveMutation.mutate({ keyId, token: jwt })}
            isProposing={
              proposeMutation.isPending &&
              proposeMutation.variables?.keyId === control.keyId
            }
            isApproving={
              approveMutation.isPending &&
              approveMutation.variables?.keyId === control.keyId
            }
          />
        ))
      )}
    </div>
  );
}
