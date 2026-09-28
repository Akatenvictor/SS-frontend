"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatUsdc } from "@/lib/format";
import { TopUpDialog } from "./TopUpDialog";

interface TopUpCtaProps {
    address: string;
    balance: number | null;
    requiredAmount: number;
    className?: string;
}

/**
 * Shown when the wallet cannot cover an investment. Makes the shortfall
 * explicit and opens the top-up flow rather than failing silently.
 */
export function TopUpCta({ address, balance, requiredAmount, className }: TopUpCtaProps) {
    // A null balance means the balance is still unknown; do not accuse the user
    // of being underfunded on a guess.
    if (balance === null) {
        return null;
    }

    if (balance >= requiredAmount) {
        return null;
    }

    const shortfall = requiredAmount - balance;

    return (
        <div
            role="alert"
            data-testid="insufficient-balance"
            className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/50 bg-amber-50 p-3 ${className ?? ""}`}
        >
            <p className="flex items-center gap-2 text-sm text-amber-900">
                <AlertCircle className="size-4" />
                Insufficient USDC balance. You need{" "}
                <span className="font-semibold">{formatUsdc(shortfall)}</span> more to invest{" "}
                {formatUsdc(requiredAmount)}.
            </p>
            <TopUpDialog
                address={address}
                balance={balance}
                requiredAmount={requiredAmount}
                trigger={
                    <Button size="sm" data-testid="top-up-cta">
                        Top up wallet
                    </Button>
                }
            />
        </div>
    );
}
