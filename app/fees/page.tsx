"use client";

import { useEffect, useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { fetchFeeSchedule, type FeeScheduleResponse, type FeeType, INDUSTRY_BENCHMARKS, type IndustryBenchmark } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Calculator, BarChart3, ExternalLink, Info, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const SAMPLE_INVESTMENT = 10000;
const FEE_TYPE_ORDER: FeeType[] = ["investment_fee", "secondary_market_fee", "settlement_fee", "early_exit_penalty"];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "XLM",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function calculateFee(amount: number, rate: number): number {
  return (amount * rate) / 100;
}

function WorkedExamples({ fees }: { fees: FeeScheduleResponse["fees"] }) {
  const investmentFee = fees.find((f) => f.fee_type === "investment_fee");
  const secondaryFee = fees.find((f) => f.fee_type === "secondary_market_fee");
  const settlementFee = fees.find((f) => f.fee_type === "settlement_fee");
  const earlyExitFee = fees.find((f) => f.fee_type === "early_exit_penalty");

  const investmentFeeAmount = investmentFee ? calculateFee(SAMPLE_INVESTMENT, investmentFee.rate_percentage) : 0;
  const netAfterInvestment = SAMPLE_INVESTMENT - investmentFeeAmount;

  const secondaryFeeAmount = secondaryFee ? calculateFee(netAfterInvestment, secondaryFee.rate_percentage) : 0;
  const netAfterSecondary = netAfterInvestment - secondaryFeeAmount;

  const settlementFeeAmount = settlementFee ? calculateFee(SAMPLE_INVESTMENT, settlementFee.rate_percentage) : 0;
  const netAfterSettlement = SAMPLE_INVESTMENT - settlementFeeAmount;

  const earlyExitAmount = earlyExitFee ? calculateFee(SAMPLE_INVESTMENT, earlyExitFee.rate_percentage) : 0;
  const netAfterEarlyExit = SAMPLE_INVESTMENT - earlyExitAmount;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="size-5" />
          Worked Examples (Sample Investment: {formatCurrency(SAMPLE_INVESTMENT)})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <ExampleCard
            title="Investment Fee"
            description="Initial investment into an open invoice"
            fee={investmentFee}
            grossAmount={SAMPLE_INVESTMENT}
            feeAmount={investmentFeeAmount}
            netAmount={netAfterInvestment}
            iconColor="bg-blue-500"
          />
          <ExampleCard
            title="Secondary Market Fee"
            description="Reselling fractions on secondary market"
            fee={secondaryFee}
            grossAmount={netAfterInvestment}
            feeAmount={secondaryFeeAmount}
            netAmount={netAfterSecondary}
            iconColor="bg-green-500"
          />
          <ExampleCard
            title="Settlement Fee"
            description="Deducted from gross proceeds at maturity"
            fee={settlementFee}
            grossAmount={SAMPLE_INVESTMENT}
            feeAmount={settlementFeeAmount}
            netAmount={netAfterSettlement}
            iconColor="bg-purple-500"
            appliesToIssuer
          />
          <ExampleCard
            title="Early Exit Penalty"
            description="Selling position before invoice due date"
            fee={earlyExitFee}
            grossAmount={SAMPLE_INVESTMENT}
            feeAmount={earlyExitAmount}
            netAmount={netAfterEarlyExit}
            iconColor="bg-red-500"
          />
        </div>

        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="font-semibold mb-2">Complete Investment Lifecycle Example</h4>
          <p className="text-sm text-muted-foreground mb-4">
            An investor commits {formatCurrency(SAMPLE_INVESTMENT)} to an invoice, holds to maturity, and receives settlement:
          </p>
          <div className="space-y-2 text-sm font-mono">
            <div className="flex justify-between">
              <span>Initial Investment</span>
              <span>{formatCurrency(SAMPLE_INVESTMENT)}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>− Investment Fee ({investmentFee?.rate_percentage}%)</span>
              <span>−{formatCurrency(investmentFeeAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Net Invested</span>
              <span>{formatCurrency(netAfterInvestment)}</span>
            </div>
            <div className="flex justify-between text-red-600 border-t pt-2">
              <span>− Settlement Fee ({settlementFee?.rate_percentage}%)</span>
              <span>−{formatCurrency(settlementFeeAmount)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>Net Received at Maturity</span>
              <span>{formatCurrency(netAfterSettlement)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground text-xs border-t pt-2">
              <span>Total Platform Fees</span>
              <span>{formatCurrency(investmentFeeAmount + settlementFeeAmount)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ExampleCardProps {
  title: string;
  description: string;
  fee: FeeScheduleResponse["fees"][0] | undefined;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  iconColor: string;
  appliesToIssuer?: boolean;
}

function ExampleCard({ title, description, fee, grossAmount, feeAmount, netAmount, iconColor, appliesToIssuer }: ExampleCardProps) {
  return (
    <Card className="border-l-4" style={{ borderLeftColor: iconColor.replace("bg-", "").replace("-500", "-500") }}>
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <div className={`${iconColor} text-white p-2 rounded-lg size-10 flex items-center justify-center`}>
            <Calculator className="size-5" />
          </div>
          <div className="flex-1">
            <h5 className="font-semibold">{title}</h5>
            <p className="text-xs text-muted-foreground">{description}</p>
            {appliesToIssuer && (
              <Badge variant="secondary" className="mt-1 text-xs">
                Applies to Issuer
              </Badge>
            )}
          </div>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Gross Amount</span>
            <span>{formatCurrency(grossAmount)}</span>
          </div>
          <div className="flex justify-between text-red-600">
            <span>Fee ({fee?.rate_percentage}%)</span>
            <span>−{formatCurrency(feeAmount)}</span>
          </div>
          <div className="flex justify-between font-semibold border-t pt-2">
            <span>Net Amount</span>
            <span>{formatCurrency(netAmount)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FeeTable({ fees, lastUpdated }: { fees: FeeScheduleResponse["fees"]; lastUpdated: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="size-5" />
          Fee Schedule
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Last updated: {new Date(lastUpdated).toLocaleDateString()}
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fee Type</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead>When It Applies</TableHead>
              <TableHead>Applies To</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {FEE_TYPE_ORDER.map((feeType) => {
              const fee = fees.find((f) => f.fee_type === feeType);
              if (!fee) return null;
              return (
                <TableRow key={feeType}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {fee.label}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {fee.rate_percentage}%
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs">
                    {fee.when_applies}
                  </TableCell>
                  <TableCell>
                    <Badge variant={fee.applies_to === "investor" ? "default" : fee.applies_to === "issuer" ? "secondary" : "outline"}>
                      {fee.applies_to === "investor" ? "Investor" : fee.applies_to === "issuer" ? "Issuer" : "Both"}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function IndustryComparison({ fees }: { fees: FeeScheduleResponse["fees"] }) {
  const ourFees = {
    investment_fee: fees.find((f) => f.fee_type === "investment_fee")?.rate_percentage ?? 0,
    secondary_market_fee: fees.find((f) => f.fee_type === "secondary_market_fee")?.rate_percentage ?? 0,
    settlement_fee: fees.find((f) => f.fee_type === "settlement_fee")?.rate_percentage ?? 0,
    early_exit_penalty: fees.find((f) => f.fee_type === "early_exit_penalty")?.rate_percentage ?? 0,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="size-5" />
          Industry Fee Comparison
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Platform</TableHead>
                <TableHead className="text-right">Investment Fee</TableHead>
                <TableHead className="text-right">Secondary Market</TableHead>
                <TableHead className="text-right">Settlement Fee</TableHead>
                <TableHead className="text-right">Early Exit Penalty</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {INDUSTRY_BENCHMARKS.map((benchmark, index) => (
                <TableRow key={index} className={index === 0 ? "bg-primary/5 font-medium" : ""}>
                  <TableCell className="font-medium">
                    {benchmark.platform}
                    {index === 0 && <CheckCircle className="inline size-4 text-green-500 ml-1" />}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {benchmark.investment_fee}%
                    {index > 0 && benchmark.investment_fee > ourFees.investment_fee && (
                      <span className="ml-1 text-red-500 text-xs">↑ {(benchmark.investment_fee - ourFees.investment_fee).toFixed(1)}%</span>
                    )}
                    {index > 0 && benchmark.investment_fee < ourFees.investment_fee && (
                      <span className="ml-1 text-green-500 text-xs">↓ {(ourFees.investment_fee - benchmark.investment_fee).toFixed(1)}%</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {benchmark.secondary_market_fee}%
                    {index > 0 && benchmark.secondary_market_fee > ourFees.secondary_market_fee && (
                      <span className="ml-1 text-red-500 text-xs">↑ {(benchmark.secondary_market_fee - ourFees.secondary_market_fee).toFixed(1)}%</span>
                    )}
                    {index > 0 && benchmark.secondary_market_fee < ourFees.secondary_market_fee && (
                      <span className="ml-1 text-green-500 text-xs">↓ {(ourFees.secondary_market_fee - benchmark.secondary_market_fee).toFixed(1)}%</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {benchmark.settlement_fee}%
                    {index > 0 && benchmark.settlement_fee > ourFees.settlement_fee && (
                      <span className="ml-1 text-red-500 text-xs">↑ {(benchmark.settlement_fee - ourFees.settlement_fee).toFixed(1)}%</span>
                    )}
                    {index > 0 && benchmark.settlement_fee < ourFees.settlement_fee && (
                      <span className="ml-1 text-green-500 text-xs">↓ {(ourFees.settlement_fee - benchmark.settlement_fee).toFixed(1)}%</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {benchmark.early_exit_penalty}%
                    {index > 0 && benchmark.early_exit_penalty > ourFees.early_exit_penalty && (
                      <span className="ml-1 text-red-500 text-xs">↑ {(benchmark.early_exit_penalty - ourFees.early_exit_penalty).toFixed(1)}%</span>
                    )}
                    {index > 0 && benchmark.early_exit_penalty < ourFees.early_exit_penalty && (
                      <span className="ml-1 text-green-500 text-xs">↓ {(ourFees.early_exit_penalty - benchmark.early_exit_penalty).toFixed(1)}%</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href={benchmark.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            {benchmark.source}
                            <ExternalLink className="size-3" />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          {benchmark.source}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          * Comparison data sourced from publicly available fee schedules as of 2024. Rates may vary by volume tier and region.
          Our platform uses dynamic fee tiers that decrease with higher 24h trading volume.
        </p>
      </CardContent>
    </Card>
  );
}

function FeeDetails({ fees }: { fees: FeeScheduleResponse["fees"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="size-5" />
          Detailed Fee Descriptions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {FEE_TYPE_ORDER.map((feeType) => {
          const fee = fees.find((f) => f.fee_type === feeType);
          if (!fee) return null;
          return (
            <div key={feeType} className="p-4 border rounded-lg bg-muted/30">
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5 shrink-0">
                  {fee.label}
                </Badge>
                <div className="flex-1 space-y-1">
                  <p className="text-sm">{fee.description}</p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Rate:</strong> {fee.rate_percentage}% &nbsp;|&nbsp;
                    <strong>When:</strong> {fee.when_applies} &nbsp;|&nbsp;
                    <strong>Applies to:</strong> {fee.applies_to === "investor" ? "Investor" : fee.applies_to === "issuer" ? "Issuer" : "Both"}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default function FeesPage() {
  usePageTitle("Fee Schedule");
  const [feeSchedule, setFeeSchedule] = useState<FeeScheduleResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"schedule" | "examples" | "comparison" | "details">("schedule");
  useEffect(() => {
    async function loadFees() {
      try {
        const data = await fetchFeeSchedule();
        setFeeSchedule(data);
      } catch (err) {
        setError("Failed to load fee schedule. Using default rates.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadFees();
  }, []);

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Fee Schedule</h1>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="py-8">
                <div className="h-4 w-1/4 bg-muted animate-pulse rounded mb-4" />
                <div className="h-32 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    );
  }

  if (error && !feeSchedule) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <AlertCircle className="size-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Unable to Load Fee Schedule</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </main>
    );
  }

  if (!feeSchedule) {
    return null;
  }

  return (
    <main className="container mx-auto px-4 py-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Fee Schedule</h1>
        <p className="text-muted-foreground">
          Transparent breakdown of all platform fees with worked examples and industry comparisons.
        </p>
      </header>

      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          setActiveTab(value as "schedule" | "examples" | "comparison" | "details")
        }
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="schedule">Fee Table</TabsTrigger>
          <TabsTrigger value="examples">Worked Examples</TabsTrigger>
          <TabsTrigger value="comparison">Industry Comparison</TabsTrigger>
          <TabsTrigger value="details">Full Details</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="mt-4">
          <FeeTable fees={feeSchedule.fees} lastUpdated={feeSchedule.last_updated} />
        </TabsContent>

        <TabsContent value="examples" className="mt-4">
          <WorkedExamples fees={feeSchedule.fees} />
        </TabsContent>

        <TabsContent value="comparison" className="mt-4">
          <IndustryComparison fees={feeSchedule.fees} />
        </TabsContent>

        <TabsContent value="details" className="mt-4">
          <FeeDetails fees={feeSchedule.fees} />
        </TabsContent>
      </Tabs>

      <div className="p-4 bg-muted/30 rounded-lg text-sm text-muted-foreground">
        <p className="font-medium mb-1">Important Notes:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Fees are subject to change. Check this page for the most current rates.</li>
          <li>Investment fees are deducted at the time of investment commitment.</li>
          <li>Secondary market fees apply only when selling fractions before maturity.</li>
          <li>Settlement fees are deducted from the issuer&apos;s gross proceeds at maturity.</li>
          <li>Early exit penalty applies in addition to secondary market fees when selling before due date.</li>
          <li>Volume-based fee tiers may reduce rates for high-volume participants.</li>
        </ul>
      </div>
    </main>
  );
}