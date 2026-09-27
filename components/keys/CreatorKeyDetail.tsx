"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GovernanceTab } from "@/components/keys/GovernanceTab";
import { BuyKeyPanel } from "@/components/keys/BuyKeyPanel";
import { CreatorVestingSection } from "@/components/keys/CreatorVestingSection";
import { CreatorRevenueSection } from "@/components/keys/CreatorRevenueSection";
import { DistributeDividendsPanel } from "@/components/keys/DistributeDividendsPanel";
import { SupplyCapSettings } from "@/components/keys/SupplyCapSettings";
import { WhitelistManager } from "@/components/keys/WhitelistManager";
import { CurveMigrationTimeline } from "@/components/keys/CurveMigrationTimeline";
import { useCreatorKey, useKeySupply } from "@/hooks/useCreatorKeys";
import { useAuth } from "@/hooks/useAuth";
import { usePageTitle } from "@/hooks/usePageTitle";

interface CreatorKeyDetailProps {
  keyId: string;
}

function CreatorKeyDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
        </CardHeader>
      </Card>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-44 w-full" />
      </div>
    </div>
  );
}

export function CreatorKeyDetail({ keyId }: CreatorKeyDetailProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "governance" | "settings" | "whitelist"
  >("overview");
  const { jwt } = useAuth();
  const { data: creatorKey, isLoading } = useCreatorKey(keyId, jwt);
  const { data: supply } = useKeySupply(keyId, jwt);

  usePageTitle(creatorKey?.title ?? null);

  if (isLoading || !creatorKey) {
    return <CreatorKeyDetailSkeleton />;
  }

  const holderBalance = creatorKey.holder_balance ?? 0;
  const isHolder = Boolean(creatorKey.is_holder || holderBalance > 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <Button asChild variant="ghost" size="sm" className="px-0">
                <Link href="/marketplace">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Link>
              </Button>
              <h1 className="truncate text-2xl font-bold">{creatorKey.title}</h1>
              <p className="text-sm text-muted-foreground">
                Creator: {creatorKey.creator_name}
              </p>
            </div>
            <div className="rounded-md bg-muted px-3 py-2 text-sm">
              <span className="text-muted-foreground">Holders </span>
              <span className="font-semibold">
                {creatorKey.holders_count.toLocaleString()}
              </span>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="flex border-b gap-4">
            <button
              type="button"
              className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === "overview"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </button>
            <button
              type="button"
              className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === "governance"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("governance")}
              data-testid="governance-tab"
            >
              Governance
            </button>
            {creatorKey.is_creator && (
              <>
              <button
                type="button"
                className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === "settings"
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab("settings")}
                data-testid="settings-tab"
              >
                Settings
              </button>
              <button
                type="button"
                className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === "whitelist"
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab("whitelist")}
                data-testid="whitelist-tab"
              >
                Whitelist
              </button>
              </>
            )}
          </div>

          {activeTab === "overview" ? (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Overview</h2>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  {creatorKey.description ||
                    "No description has been added for this creator key yet."}
                </p>
                {isHolder && (
                  <p>
                    Your balance:{" "}
                    <span className="font-semibold text-foreground">
                      {holderBalance.toLocaleString()} keys
                    </span>
                  </p>
                )}
              </CardContent>
            </Card>
          ) : null}

          {activeTab === "overview" && creatorKey.is_creator && (
            <>
              <CreatorVestingSection keyId={creatorKey.id} />
              <CreatorRevenueSection keyId={creatorKey.id} />
              <DistributeDividendsPanel
                keyId={creatorKey.id}
                holdersCount={creatorKey.holders_count}
              />
            </>
          )}

          {activeTab === "settings" && creatorKey.is_creator && (
            <>
              <CurveMigrationTimeline keyId={creatorKey.id} isCreator={creatorKey.is_creator} />
              <SupplyCapSettings keyId={creatorKey.id} />
            </>
          )}

          {activeTab === "governance" && (
            <GovernanceTab
              keyId={creatorKey.id}
              isHolder={isHolder}
              isCreator={creatorKey.is_creator}
            />
          )}

          {activeTab === "whitelist" && creatorKey.is_creator && (
            <WhitelistManager
              keyId={creatorKey.id}
              whitelistEnabled={creatorKey.whitelist_enabled}
            />
          )}
        </div>

        <BuyKeyPanel creatorKey={creatorKey} supply={supply} />
      </div>
    </div>
  );
}
