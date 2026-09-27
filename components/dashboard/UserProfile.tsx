"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { WalletActivityFeed } from "@/components/dashboard/WalletActivityFeed";
import { useAuth } from "@/hooks/useAuth";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import { truncateAddress } from "@/lib/stellar";

type ProfileTab = "overview" | "activity";

export function UserProfile() {
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const { address: authAddress } = useAuth();
  const { address: walletAddress, network } = useStellarWallet();

  const address = authAddress ?? walletAddress ?? null;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Wallet</p>
          <p className="font-mono text-lg font-semibold" data-testid="profile-address">
            {address ? truncateAddress(address) : "Not connected"}
          </p>
          {network && (
            <p className="text-xs text-muted-foreground capitalize">{network}</p>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-4 border-b">
        <button
          type="button"
          className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "overview"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("overview")}
          data-testid="profile-overview-tab"
        >
          Overview
        </button>
        <button
          type="button"
          className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "activity"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("activity")}
          data-testid="profile-activity-tab"
        >
          Activity
        </button>
      </div>

      {activeTab === "overview" ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Your wallet activity, holdings, and dividends are tracked on-chain. Open the
            Activity tab to see your full history.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Activity</h2>
          <WalletActivityFeed address={address} />
        </div>
      )}
    </div>
  );
}
