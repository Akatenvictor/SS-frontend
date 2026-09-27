"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import { PublishInvoiceForm } from "@/components/invoices";

export default function PublishInvoicePage() {
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
    <main className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Publish Invoice</h1>
      <PublishInvoiceForm />
    </main>
  );
}
