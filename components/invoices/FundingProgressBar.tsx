"use client";

import { useEffect, useState } from "react";

interface FundingProgressBarProps {
    /** Amount raised so far. The API may omit it for a brand new invoice. */
    raised: number | null | undefined;
    target: number;
    investorCount: number;
}

function formatAmount(amount: number) {
    return amount.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
}

export function FundingProgressBar({ raised, target, investorCount }: FundingProgressBarProps) {
    const [animatedWidth, setAnimatedWidth] = useState(0);

    // A missing raised value means nothing has been committed yet, not a crash.
    const raisedAmount = raised ?? 0;
    const percentage = target > 0 ? Math.min((raisedAmount / target) * 100, 100) : 0;
    const isFullyFunded = percentage >= 100;

    useEffect(() => {
        // Animate from the previous width to the latest percentage after render.
        const timer = setTimeout(() => {
            setAnimatedWidth(percentage);
        }, 100);
        return () => clearTimeout(timer);
    }, [percentage]);

    return (
        <div className="space-y-4">
            <div>
                <div className="mb-2 flex justify-between text-sm">
                    <span>Raised</span>
                    <span>{percentage.toFixed(1)}%</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                        data-testid="funding-progress-bar"
                        role="progressbar"
                        aria-valuenow={Math.round(percentage)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        className={`h-full transition-all duration-1000 ease-out ${isFullyFunded ? "bg-green-500" : "bg-primary"}`}
                        style={{ width: `${animatedWidth}%` }}
                    />
                </div>
            </div>
            <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                    {formatAmount(raisedAmount)} XLM of {formatAmount(target)} XLM
                </p>
                <div className="flex items-center gap-2">
                    {isFullyFunded && (
                        <span className="inline-flex items-center rounded-full border border-transparent bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                            Funded
                        </span>
                    )}
                    <span className="text-sm text-muted-foreground">
                        {investorCount} {investorCount === 1 ? "investor" : "investors"}
                    </span>
                </div>
            </div>
        </div>
    );
}
