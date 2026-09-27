"use client";

import { UserProfile } from "@/components/dashboard/UserProfile";
import { ThemeSelector } from "@/components/layout/ThemeSelector";
import { Card, CardContent } from "@/components/ui/card";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function ProfilePage() {
  usePageTitle("Profile");

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Profile</h1>
      <UserProfile />
      <section aria-labelledby="settings-heading" className="mt-8">
        <h2 id="settings-heading" className="mb-4 text-lg font-semibold">
          Settings
        </h2>
        <Card>
          <CardContent className="pt-6">
            <ThemeSelector />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
