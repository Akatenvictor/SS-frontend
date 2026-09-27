"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function PublishSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get("invoiceId");

  useEffect(() => {
    if (!invoiceId) {
      router.replace("/dashboard/seller");
    }
  }, [invoiceId, router]);

  if (!invoiceId) {
    return null;
  }

  return (
    <main className="container mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-bold">Invoice Submitted</h1>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Your invoice has been submitted for review
            </p>
            <p className="font-mono text-sm">
              Invoice ID: <span className="font-semibold">{invoiceId}</span>
            </p>
          </div>

          <div className="space-y-2 bg-secondary p-4 rounded-lg">
            <h2 className="font-semibold text-sm">Next Steps</h2>
            <p className="text-sm text-muted-foreground">
              You will be notified once your invoice is reviewed (usually within 24 hours)
            </p>
          </div>

          <Button
            onClick={() => router.push("/dashboard/seller")}
            className="w-full"
          >
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
