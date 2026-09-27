"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePageLoadPerformanceLog } from "@/hooks/usePageLoadPerformanceLog";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import { usePageTitle } from "@/hooks/usePageTitle";
import { SellerDashboard } from "@/components/dashboard";
import { Button } from "@/components/ui/button";

export default function SellerDashboardPage() {
  usePageLoadPerformanceLog("seller_dashboard");
  usePageTitle("My Dashboard");
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Seller Dashboard</h1>
        <Button asChild>
          <Link href="/seller/publish">Publish Invoice</Link>
        </Button>
      </div>
      <SellerDashboard />
    </main>
  );
}
