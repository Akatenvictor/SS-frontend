"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ShieldAlert } from "lucide-react";

interface RiskRatingBadgeProps {
  tier: "A" | "B" | "C" | "D";
  score: number;
}

const tierColors = {
  A: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  B: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  C: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  D: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
};

const tierDescriptions = {
  A: "Low risk - Excellent creditworthiness",
  B: "Moderate risk - Good creditworthiness",
  C: "High risk - Fair creditworthiness",
  D: "Very high risk - Poor creditworthiness",
};

export function RiskRatingBadge({ tier, score }: RiskRatingBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={tierColors[tier]}>
            <ShieldAlert className="h-3 w-3 mr-1" />
            {tier}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{tierDescriptions[tier]}</p>
          <p className="text-xs text-muted-foreground">Score: {score}/100</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
