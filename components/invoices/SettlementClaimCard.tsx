"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import type { ClaimableSettlement, ClaimedHistory } from "@/hooks/useSettlements";

interface ClaimableCardProps {
  settlement: ClaimableSettlement;
  onClaim: (invoiceId: string) => void;
  isClaiming: boolean;
}

export function ClaimableSettlementCard({ settlement, onClaim, isClaiming }: ClaimableCardProps) {
  const { format } = useCurrency();

  return (
    <Card data-testid={`claimable-${settlement.invoice_id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{settlement.invoice_title}</CardTitle>
          <Badge variant="default">Claimable</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Invested</span>
            <p className="font-medium">{format(settlement.invested_amount)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Return</span>
            <p className="font-medium text-emerald-500">{format(settlement.return_amount)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Net Profit</span>
            <p className="font-medium text-emerald-500">+{format(settlement.net_profit)}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Settled {new Date(settlement.settled_at).toLocaleDateString()}
        </p>
        <Button
          size="sm"
          className="mt-3"
          onClick={() => onClaim(settlement.invoice_id)}
          disabled={isClaiming}
          data-testid="claim-btn"
        >
          {isClaiming ? "Claiming..." : "Claim Funds"}
        </Button>
      </CardContent>
    </Card>
  );
}

interface ClaimedHistoryCardProps {
  entry: ClaimedHistory;
}

export function ClaimedHistoryCard({ entry }: ClaimedHistoryCardProps) {
  const { format } = useCurrency();

  return (
    <Card data-testid={`claimed-${entry.invoice_id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{entry.invoice_title}</CardTitle>
          <Badge variant="secondary">Claimed</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Invested</span>
            <p className="font-medium">{format(entry.invested_amount)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Claimed</span>
            <p className="font-medium">{format(entry.claimed_amount)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Date</span>
            <p className="font-medium">{new Date(entry.claimed_at).toLocaleDateString()}</p>
          </div>
        </div>
        {entry.tx_hash && (
          <a
            href={`https://stellar.expert/explorer/public/tx/${entry.tx_hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
            data-testid="tx-link"
          >
            View Transaction <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </CardContent>
    </Card>
  );
}
