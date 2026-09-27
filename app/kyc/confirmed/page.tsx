"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function KycConfirmedPage() {
  return (
    <main className="container mx-auto px-4 py-8 max-w-lg text-center">
      <h1 className="text-2xl font-bold mb-4">KYC Submitted</h1>
      <p className="text-muted-foreground mb-6">
        Your KYC documents have been submitted and are under review.
        You will be notified once the verification is complete.
      </p>
      <Button asChild>
        <Link href="/seller">Back to Dashboard</Link>
      </Button>
    </main>
  );
}
