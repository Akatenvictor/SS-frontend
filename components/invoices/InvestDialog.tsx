"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { InvestmentAmountInput } from "@/components/invoices/InvestmentAmountInput";
import { FeeTierDisplay } from "@/components/invoices/FeeTierDisplay";
import { PriceImpactWarning } from "@/components/invoices/PriceImpactWarning";
import { useInvestMutation } from "@/hooks/useInvestments";
import { Loader2 } from "lucide-react";

interface InvestDialogProps {
  invoiceId: string;
  invoiceTitle: string;
  remainingAmount: number;
  fundingCap?: number;
}

export function InvestDialog({
  invoiceId,
  invoiceTitle,
  remainingAmount,
  fundingCap,
}: InvestDialogProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number | null>(null);
  const investMutation = useInvestMutation();

  const handleInvest = async () => {
    if (amount === null) return;

    try {
      await investMutation.mutateAsync({ invoiceId, amount });
      setOpen(false);
      setAmount(null);
    } catch (error) {
      // Error handling is done by the mutation's onError callback
      console.error("Investment failed:", error);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button data-testid="invest-button">Invest</Button>
      </PopoverTrigger>
      <PopoverContent className="w-full max-w-sm p-0" align="start">
        <Card className="border-0">
          <CardHeader>
            <CardTitle>Invest in Invoice</CardTitle>
            <CardDescription className="truncate">
              {invoiceTitle}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Available to invest:
                </span>
                <span className="font-semibold">
                  {remainingAmount.toLocaleString()} XLM
                </span>
              </div>
            </div>

            <InvestmentAmountInput
              min={1}
              max={remainingAmount}
              onValidAmountChange={setAmount}
            />

            <FeeTierDisplay amount={amount} />

            <PriceImpactWarning
              amount={amount}
              fundingCap={fundingCap ?? remainingAmount}
            />

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={investMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleInvest}
                disabled={amount === null || investMutation.isPending}
                className="flex-1"
              >
                {investMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {investMutation.isPending
                  ? "Investing..."
                  : "Confirm Investment"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
