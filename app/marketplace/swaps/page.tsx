"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AtomicSwapForm, type SwapProposal } from "@/components/marketplace/AtomicSwapForm";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

async function createSwapProposal(proposal: SwapProposal): Promise<{ id: string; shareLink: string }> {
  const res = await fetch("/api/marketplace/swaps", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(proposal),
  });
  if (!res.ok) throw new Error("Failed to create swap proposal");
  return res.json();
}

export default function AtomicSwapPage() {
  usePageTitle("Atomic Swaps");
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("initiate");

  const createMutation = useMutation({
    mutationFn: createSwapProposal,
    onSuccess: (data) => {
      toast.success("Swap proposal created!");
      router.push(`/marketplace/swaps/${data.id}`);
    },
    onError: () => {
      toast.error("Failed to create swap proposal");
    },
  });

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Atomic Swaps</h1>
          <p className="text-muted-foreground">
            Negotiate and execute direct key-to-key exchanges with other wallets
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="initiate">Initiate</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="initiate" className="space-y-4">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <AtomicSwapForm
                  onSubmit={(proposal) => createMutation.mutateAsync(proposal)}
                  isSubmitting={createMutation.isPending}
                />
              </div>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <h3 className="font-semibold">How It Works</h3>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <div>
                      <p className="font-medium text-foreground mb-1">1. Create Proposal</p>
                      <p>Fill out the form with both sides of the swap</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground mb-1">2. Share Link</p>
                      <p>Send the proposal link to your counterparty</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground mb-1">3. Review & Accept</p>
                      <p>Both parties review and accept to execute</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground mb-1">4. Execute</p>
                      <p>Atomic swap transaction executes on-chain</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pending">
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground py-8">
                  No pending swap proposals yet
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground py-8">
                  No swap history yet
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
