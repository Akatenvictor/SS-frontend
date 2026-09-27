"use client";

import { KycOnboardingForm } from "@/components/dashboard/KycOnboardingForm";

export default function KycOnboardingPage() {
  return (
    <main className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">KYC Verification</h1>
      <p className="text-muted-foreground mb-6">
        Complete the steps below to verify your identity and unlock investing.
      </p>
      <KycOnboardingForm />
    </main>
  );
}
