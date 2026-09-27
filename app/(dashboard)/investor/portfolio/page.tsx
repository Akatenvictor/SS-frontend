"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import { usePageTitle } from "@/hooks/usePageTitle";
import { usePageLoadPerformanceLog } from "@/hooks/usePageLoadPerformanceLog";
import { InvestorPortfolioPage } from "@/components/dashboard/InvestorPortfolioPage";

export default function PortfolioPage() {
  usePageLoadPerformanceLog("investor_portfolio_page");
  usePageTitle("My Portfolio");
  const router = useRouter();
  const { isConnected, isInitializing } = useStellarWallet();

  useEffect(() => {
    if (!isInitializing && !isConnected) {
      router.replace("/connect-wallet");
    }
  }, [isInitializing, isConnected, router]);

  if (isInitializing || !isConnected) {
    return null;
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Portfolio</h1>
      <InvestorPortfolioPage />
    </main>
  );
}
