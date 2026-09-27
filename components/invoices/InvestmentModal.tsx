"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InvestmentAmountInput } from "@/components/invoices/InvestmentAmountInput";
import { TopUpCta } from "@/components/wallet/TopUpCta";
import { useUsdcBalance } from "@/hooks/useUsdcBalance";
import { investInInvoice } from "@/lib/api";
import { formatUsdc } from "@/lib/format";
import type { Network } from "@/lib/stellar";

/** Smallest investment the platform accepts, in USDC. */
export const MIN_INVESTMENT = 10;

interface InvestmentModalProps {
    invoiceId: string;
    invoiceTitle: string;
    /** Remaining amount that can still be funded. */
    maxAmount: number;
    address: string | null;
    network: Network | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Called after a successful investment so callers can refresh balances. */
    onInvested?: () => void;
}

type SubmitState = "idle" | "submitting" | "success" | "error";

/**
 * Collects an investment amount and guards it against the wallet's USDC
 * balance, offering a top-up when the wallet is short.
 */
export function InvestmentModal({
    invoiceId,
    invoiceTitle,
    maxAmount,
    address,
    network,
    open,
    onOpenChange,
    onInvested,
}: InvestmentModalProps) {
    const [amount, setAmount] = useState<number | null>(null);
    const [state, setState] = useState<SubmitState>("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const { balance } = useUsdcBalance(address, network);

    const isConnected = Boolean(address);
    const insufficient =
        balance !== null && amount !== null && amount > 0 && amount > balance;

    const canSubmit = isConnected && amount !== null && amount > 0 && !insufficient;

    async function handleSubmit() {
        if (!canSubmit || amount === null) return;
        setState("submitting");
        setErrorMessage(null);
        try {
            await investInInvoice(invoiceId, amount);
            setState("success");
            onInvested?.();
        } catch (error) {
            setState("error");
            setErrorMessage(
                error instanceof Error ? error.message : "Investment failed. Please try again."
            );
        }
    }

    const dialogDescription = useMemo(
        () => `Choose how much to invest in "${invoiceTitle}".`,
        [invoiceTitle]
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent data-testid="investment-modal">
                <DialogHeader>
                    <DialogTitle>Invest in this invoice</DialogTitle>
                    <DialogDescription>{dialogDescription}</DialogDescription>
                </DialogHeader>

                {!isConnected ? (
                    <p data-testid="investment-connect-required" className="text-sm text-muted-foreground">
                        Connect your wallet to invest.
                    </p>
                ) : (
                    <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                            Wallet balance:{" "}
                            <span data-testid="investment-modal-balance" className="font-medium text-foreground">
                                {balance === null ? "Loading…" : formatUsdc(balance)}
                            </span>
                        </p>

                        <InvestmentAmountInput
                            min={MIN_INVESTMENT}
                            max={maxAmount}
                            onValidAmountChange={setAmount}
                        />

                        {insufficient && (
                            <TopUpCta
                                address={address as string}
                                balance={balance}
                                requiredAmount={amount as number}
                            />
                        )}
                    </div>
                )}

                {state === "error" && errorMessage && (
                    <p role="alert" data-testid="investment-error" className="text-sm text-destructive">
                        {errorMessage}
                    </p>
                )}

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        data-testid="investment-cancel"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!canSubmit || state === "submitting"}
                        data-testid="investment-submit"
                    >
                        {state === "submitting" && <Loader2 className="size-4 animate-spin" />}
                        {state === "success" ? "Invested" : "Invest"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
