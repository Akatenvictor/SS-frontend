"use client";

import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { isKycApproved, type IssuerProfile as IssuerProfileType } from "@/lib/issuers";

interface VerifiedBadgeProps {
  issuer: Pick<IssuerProfileType, "kyc_status">;
}

/**
 * Renders the verified badge only for KYC-approved issuers. Pending and
 * rejected issuers render nothing at all rather than a misleading grey badge.
 */
export function VerifiedBadge({ issuer }: VerifiedBadgeProps) {
  if (!isKycApproved(issuer)) {
    return null;
  }

  return (
    <Badge
      data-testid="issuer-verified-badge"
      className="bg-green-100 text-green-800 hover:bg-green-100"
    >
      <ShieldCheck className="size-3" />
      Verified
    </Badge>
  );
}

interface KycStatusNoticeProps {
  issuer: Pick<IssuerProfileType, "kyc_status">;
}

/** Explains the absence of a verified badge, so it never looks like a bug. */
export function KycStatusNotice({ issuer }: KycStatusNoticeProps) {
  if (isKycApproved(issuer)) {
    return null;
  }

  const label =
    issuer.kyc_status === "rejected" ? "KYC rejected" : "KYC pending";

  return (
    <span data-testid="issuer-kyc-notice" className="text-xs text-muted-foreground">
      {label} — not verified yet
    </span>
  );
}
