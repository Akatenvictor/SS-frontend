"use client";

import Link from "next/link";
import { Lock, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccreditationStatus, useCanInvestInInvoice } from "@/hooks/useAccreditationStatus";
import { useWallet } from "@/context/WalletContext";
import type { AccreditationTier } from "@/lib/api";

const ACCREDITATION_UPGRADE_URL = "/kyc/accreditation";

const TIER_VARIANT: Record<AccreditationTier, "default" | "secondary" | "outline"> = {
  qualified: "default",
  accredited: "secondary",
  unaccredited: "outline",
};

const TIER_LABEL: Record<AccreditationTier, string> = {
  qualified: "Qualified Investor",
  accredited: "Accredited Investor",
  unaccredited: "Unaccredited",
};

export function AccreditationBadge() {
  const { isConnected } = useWallet();
  const { data, isLoading } = useAccreditationStatus({ enabled: isConnected });

  if (!isConnected) return null;
  if (isLoading) return <Skeleton className="h-5 w-32" data-testid="accreditation-badge-loading" />;
  if (!data) return null;

  return (
    <Badge variant={TIER_VARIANT[data.tier]} className="inline-flex items-center gap-1" data-testid="accreditation-badge">
      <ShieldCheck className="h-3 w-3" />
      {TIER_LABEL[data.tier]}
    </Badge>
  );
}

interface AccreditationGateProps {
  faceValue: number;
  children: React.ReactNode;
}

export function AccreditationGate({ faceValue, children }: AccreditationGateProps) {
  const { isConnected } = useWallet();
  const { canInvest, isLoading, tier, threshold } = useCanInvestInInvoice(faceValue);

  if (!isConnected) return <>{children}</>;

  if (isLoading) {
    return (
      <Card data-testid="accreditation-gate-loading">
        <CardContent className="pt-6"><Skeleton className="h-9 w-40" /></CardContent>
      </Card>
    );
  }

  if (canInvest) return <>{children}</>;

  return (
    <Card data-testid="accreditation-gate-locked">
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Lock className="h-4 w-4 text-destructive" />
          <span>
            This invoice requires <strong>Accredited Investor</strong> status (face value ≥ {threshold.toLocaleString()} XLM).
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Your current tier: <strong>{tier ? TIER_LABEL[tier] : "Unknown"}</strong>
        </p>
        <Button asChild variant="outline" size="sm" data-testid="accreditation-upgrade-cta">
          <Link href={ACCREDITATION_UPGRADE_URL}>Upgrade Accreditation</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
