"use client";

import { KycSubmissionForm } from "@/components/dashboard";

export default function KycStartPage() {
  return (
    <main className="container mx-auto px-4 py-8 max-w-lg">
      <h1 className="text-2xl font-bold mb-6">KYC Verification</h1>
      <KycSubmissionForm status="not_submitted" />
    </main>
  );
}
