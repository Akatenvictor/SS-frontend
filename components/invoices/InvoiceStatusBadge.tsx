"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";

export type InvoiceStatus = "draft" | "published" | "funded" | "settled" | "expired" | "active" | "rejected";

interface InvoiceStatusBadgeProps {
    status?: InvoiceStatus | string | null;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link"; tooltip: string }> = {
    draft: { label: "Draft", variant: "secondary", tooltip: "This invoice has not been submitted for review yet" },
    published: { label: "Open", variant: "outline", tooltip: "This invoice is open for investment" },
    open: { label: "Open", variant: "outline", tooltip: "This invoice is open for investment" },
    active: { label: "Active", variant: "outline", tooltip: "This invoice is open for investment" },
    funded: { label: "Funded", variant: "default", tooltip: "This invoice has reached its funding target" },
    settled: { label: "Settled", variant: "ghost", tooltip: "Investors have received their returns" },
    expired: { label: "Expired", variant: "destructive", tooltip: "This invoice did not reach its funding target in time" },
    rejected: { label: "Rejected", variant: "destructive", tooltip: "This invoice was rejected during review" },
};

export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
    const [showTooltip, setShowTooltip] = useState(false);

    if (status === null || status === undefined) {
        return null;
    }

    const config = statusConfig[status] ?? { label: "Unknown", variant: "secondary" as const, tooltip: "" };

    return (
        <div className="relative inline-block">
            <Badge
                variant={config.variant}
                tabIndex={0}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onFocus={() => setShowTooltip(true)}
                onBlur={() => setShowTooltip(false)}
                className="cursor-help"
                role="tooltip"
            >
                {config.label}
            </Badge>
            {showTooltip && config.tooltip && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded border border-input whitespace-nowrap pointer-events-none z-50">
                    {config.tooltip}
                </div>
            )}
        </div>
    );
}