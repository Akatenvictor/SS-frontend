"use client";

import { useState } from "react";
import { UserProfile } from "@/components/dashboard/UserProfile";
import { RiskProfileQuestionnaire } from "@/components/onboarding/RiskProfileQuestionnaire";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSuitabilityTier } from "@/hooks/useSuitabilityTier";
import { TIER_LABELS } from "@/lib/suitability";

export default function ProfilePage() {
  usePageTitle("Profile");
  const { tier, setTier } = useSuitabilityTier();
  const [retaking, setRetaking] = useState(false);

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Profile</h1>
      <UserProfile />

      <section className="mt-8 space-y-3" aria-labelledby="risk-profile-heading">
        <h2 id="risk-profile-heading" className="text-lg font-semibold">
          Risk profile
        </h2>
        {retaking ? (
          <RiskProfileQuestionnaire
            onComplete={(next) => {
              setTier(next);
              setRetaking(false);
            }}
            onCancel={() => setRetaking(false)}
          />
        ) : (
          <div className="flex items-center gap-4">
            <p className="text-sm">
              Suitability tier:{" "}
              <strong data-testid="profile-tier">{tier ? TIER_LABELS[tier] : "Not set"}</strong>
            </p>
            <Button variant="outline" onClick={() => setRetaking(true)}>
              {tier ? "Retake questionnaire" : "Take questionnaire"}
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}
