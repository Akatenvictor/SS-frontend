"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";

export default function ConnectWalletPage() {
  const router = useRouter();
  const { jwt, isConnecting, isInitializing, loginWithWallet } = useAuth();

  useEffect(() => {
    if (jwt) router.replace("/marketplace");
  }, [jwt, router]);

  return (
    <main className="container mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4 py-8">
      <Card className="w-full">
        <CardHeader className="text-center">
          <h1 className="text-xl font-bold">Connect Your Wallet</h1>
          <p className="text-sm text-muted-foreground">
            Connect a Stellar wallet to access your dashboard.
          </p>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button onClick={() => void loginWithWallet()} disabled={isConnecting || Boolean(isInitializing) || Boolean(jwt)}>
            <Wallet className="mr-2 h-4 w-4" />
            {isInitializing ? "Restoring session..." : jwt ? "Wallet connected" : isConnecting ? "Verify wallet..." : "Connect Wallet"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
