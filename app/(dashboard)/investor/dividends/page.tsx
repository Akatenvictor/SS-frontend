"use client";

import { DividendClaimPage } from "@/components/dashboard/DividendClaimPage";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function InvestorDividendsPage() {
  usePageTitle("Dividend Claims");

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Dividend Claims</h1>
      <DividendClaimPage />
    </main>
  );
}
