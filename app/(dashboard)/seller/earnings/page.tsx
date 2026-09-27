"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import { usePageTitle } from "@/hooks/usePageTitle";
import { IssuerEarningsDashboard } from "@/components/dashboard/IssuerEarningsDashboard";

export default function EarningsPage() {
  usePageTitle("Earnings");
  const router = useRouter();
  const { isConnected, isInitializing } = useStellarWallet();

  useEffect(() => {
    if (!isInitializing && !isConnected) {
      router.replace("/connect-wallet");
    }
  }, [isInitializing, isConnected, router]);

  if (isInitializing || !isConnected) return null;

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Earnings</h1>
      <IssuerEarningsDashboard />
    </main>
  );
}
