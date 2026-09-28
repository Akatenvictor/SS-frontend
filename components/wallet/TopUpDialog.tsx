"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Wallet } from "lucide-react";
import QRCode from "react-qr-code";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatUsdc } from "@/lib/format";
import { truncateAddress } from "@/lib/stellar";

interface TopUpDialogProps {
    address: string;
    /** Current balance, shown so the user knows how much more they need. */
    balance?: number | null;
    requiredAmount?: number | null;
    /** Rendered as the trigger. */
    trigger?: React.ReactNode;
}

export interface TopUpDialogRef {
    open: () => void;
}

/** Milliseconds the "copied" confirmation stays visible. */
const COPY_FEEDBACK_MS = 2000;

function isStellarAddress(address: string): boolean {
    return address.startsWith("G") && address.length >= 56;
}

/**
 * Guides the user to fund their wallet: a scannable QR of the address plus a
 * one-click copy, so they can send USDC from an exchange or another wallet.
 */
export function TopUpDialog({
    address,
    balance,
    requiredAmount,
    trigger,
}: TopUpDialogProps) {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const shortfall =
        balance != null && requiredAmount != null && requiredAmount > balance
            ? requiredAmount - balance
            : null;

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
        } catch {
            // Clipboard access can be denied; the address stays selectable.
            setCopied(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger ? (
                <DialogTrigger asChild>{trigger}</DialogTrigger>
            ) : (
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" data-testid="open-top-up">
                        Top up
                    </Button>
                </DialogTrigger>
            )}

            <DialogContent data-testid="top-up-dialog">
                <DialogHeader>
                    <DialogTitle>Top up your wallet</DialogTitle>
                    <DialogDescription>
                        Send USDC on Stellar to this address from an exchange or
                        another wallet, then come back and refresh.
                    </DialogDescription>
                </DialogHeader>

                {shortfall !== null && (
                    <p className="text-sm" data-testid="top-up-shortfall">
                        You need{" "}
                        <span className="font-semibold">{formatUsdc(shortfall)}</span> more to
                        cover this investment.
                    </p>
                )}

                <div className="flex flex-col items-center gap-4">
                    <div
                        data-testid="top-up-qr"
                        className="rounded-lg border bg-white p-4"
                        aria-label="QR code containing your wallet address"
                    >
                        <QRCode
                            value={address}
                            size={192}
                            bgColor="#ffffff"
                            fgColor="#000000"
                            level="M"
                            data-testid="top-up-qr-code"
                        />
                    </div>

                    <p className="text-xs text-muted-foreground">Your wallet address</p>

                    <div className="flex w-full items-center gap-2">
                        <code
                            data-testid="top-up-address"
                            className="flex-1 break-all rounded-md border bg-muted px-3 py-2 font-mono text-xs"
                        >
                            {isStellarAddress(address) ? address : truncateAddress(address)}
                        </code>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleCopy}
                            data-testid="top-up-copy"
                            aria-label="Copy wallet address"
                        >
                            {copied ? (
                                <>
                                    <Check className="size-4" />
                                    Copied
                                </>
                            ) : (
                                <>
                                    <Copy className="size-4" />
                                    Copy
                                </>
                            )}
                        </Button>
                    </div>

                    {copied && (
                        <p
                            role="status"
                            data-testid="top-up-copy-feedback"
                            className="text-xs text-green-700"
                        >
                            Address copied to clipboard
                        </p>
                    )}

                    <a
                        href="https://stellar.org/laboratory"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
                    >
                        <ExternalLink className="size-3" />
                        Open Stellar Laboratory
                    </a>

                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Wallet className="size-3" />
                      Only send USDC on the Stellar network to this address.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
