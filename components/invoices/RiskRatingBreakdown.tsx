"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface RiskRatingBreakdownProps {
  breakdown: {
    seller_history: number;
    invoice_age: number;
    amount: number;
    sector: number;
  };
}

const factorDescriptions = {
  seller_history: "Based on seller's track record with previous invoices",
  invoice_age: "Time elapsed since invoice creation - newer invoices may carry higher risk",
  amount: "Invoice size relative to seller's typical transaction amounts",
  sector: "Industry-specific risk factors and market conditions",
};

export function RiskRatingBreakdown({ breakdown }: RiskRatingBreakdownProps) {
  const factors = [
    { key: "seller_history", label: "Seller History", value: breakdown.seller_history },
    { key: "invoice_age", label: "Invoice Age", value: breakdown.invoice_age },
    { key: "amount", label: "Amount", value: breakdown.amount },
    { key: "sector", label: "Sector", value: breakdown.sector },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Risk Rating Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {factors.map((factor) => (
          <div key={factor.key} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{factor.label}</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs max-w-[200px]">
                        {factorDescriptions[factor.key as keyof typeof factorDescriptions]}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <span className="text-sm font-medium">{factor.value}/100</span>
            </div>
            <Progress value={factor.value} className="h-2" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
