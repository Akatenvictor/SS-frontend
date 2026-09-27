"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRightLeft } from "lucide-react";

interface SwapFormProps {
  onSubmit: (proposal: SwapProposal) => Promise<void>;
  isSubmitting?: boolean;
}

export interface SwapProposal {
  offeringKeyId: string;
  offeringAmount: number;
  desiredKeyId: string;
  desiredAmount: number;
  counterpartyAddress: string;
}

export function AtomicSwapForm({ onSubmit, isSubmitting = false }: SwapFormProps) {
  const [proposal, setProposal] = useState<SwapProposal>({
    offeringKeyId: "",
    offeringAmount: 0,
    desiredKeyId: "",
    desiredAmount: 0,
    counterpartyAddress: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(proposal);
  };

  return (
    <Card data-testid="atomic-swap-form">
      <CardHeader>
        <h2 className="text-lg font-semibold">Initiate Atomic Swap</h2>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="offering-key" className="text-sm font-medium">
                Key to Offer
              </Label>
              <Input
                id="offering-key"
                placeholder="Key ID"
                value={proposal.offeringKeyId}
                onChange={(e) =>
                  setProposal({ ...proposal, offeringKeyId: e.target.value })
                }
                data-testid="offering-key-input"
                required
              />
            </div>

            <div>
              <Label htmlFor="offering-amount" className="text-sm font-medium">
                Amount to Offer
              </Label>
              <Input
                id="offering-amount"
                type="number"
                min="0"
                placeholder="0"
                value={proposal.offeringAmount || ""}
                onChange={(e) =>
                  setProposal({
                    ...proposal,
                    offeringAmount: parseFloat(e.target.value) || 0,
                  })
                }
                data-testid="offering-amount-input"
                required
              />
            </div>
          </div>

          <div className="flex justify-center">
            <div className="rounded-full bg-muted p-3">
              <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="desired-key" className="text-sm font-medium">
                Key to Receive
              </Label>
              <Input
                id="desired-key"
                placeholder="Key ID"
                value={proposal.desiredKeyId}
                onChange={(e) =>
                  setProposal({ ...proposal, desiredKeyId: e.target.value })
                }
                data-testid="desired-key-input"
                required
              />
            </div>

            <div>
              <Label htmlFor="desired-amount" className="text-sm font-medium">
                Amount to Receive
              </Label>
              <Input
                id="desired-amount"
                type="number"
                min="0"
                placeholder="0"
                value={proposal.desiredAmount || ""}
                onChange={(e) =>
                  setProposal({
                    ...proposal,
                    desiredAmount: parseFloat(e.target.value) || 0,
                  })
                }
                data-testid="desired-amount-input"
                required
              />
            </div>

            <div>
              <Label htmlFor="counterparty" className="text-sm font-medium">
                Counterparty Wallet Address
              </Label>
              <Input
                id="counterparty"
                placeholder="G..."
                value={proposal.counterpartyAddress}
                onChange={(e) =>
                  setProposal({
                    ...proposal,
                    counterpartyAddress: e.target.value,
                  })
                }
                data-testid="counterparty-input"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
            data-testid="submit-swap-button"
          >
            {isSubmitting ? "Creating Proposal..." : "Create Swap Proposal"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
