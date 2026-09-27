"use client";

import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { usePageTitle } from "@/hooks/usePageTitle";
import { RecentlyViewed } from "@/components/marketplace/recently-viewed";
import { TopInvestorsLeaderboard } from "@/components/marketplace/TopInvestorsLeaderboard";
import { PlatformActivityFeed } from "@/components/marketplace/PlatformActivityFeed";

export default function HomePage() {
  usePageTitle("StellarSettle — Invoice Marketplace");
  const { entries } = useRecentlyViewed();

  return (
    <main className="container mx-auto px-4 py-8 space-y-8">
      <h1 className="text-3xl font-bold">StellarSettle</h1>
      <PlatformActivityFeed />
      <TopInvestorsLeaderboard />
      <RecentlyViewed entries={entries} />
    </main>
  );
}

