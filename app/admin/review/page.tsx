"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AdminInvoiceReviewQueue } from "@/components/admin/AdminInvoiceReviewQueue";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

function parseJwt(token: string): { role?: string } | null {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(atob(base64).split("").map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")));
  } catch { return null; }
}

export default function AdminReviewPage() {
  const { jwt, isConnecting } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (isConnecting) return;
    if (!jwt) { setIsAdmin(false); return; }
    const payload = parseJwt(jwt);
    setIsAdmin(payload?.role === "admin");
  }, [jwt, isConnecting]);

  if (isConnecting || isAdmin === null) return null;

  if (!isAdmin) {
    return (
      <main className="container mx-auto px-4 py-16 flex justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 flex flex-col items-center text-center space-y-3">
            <ShieldAlert className="size-12 text-destructive" />
            <h1 className="text-xl font-bold">Access Denied</h1>
            <p className="text-sm text-muted-foreground">Admin access required.</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Invoice Review Queue</h1>
      <AdminInvoiceReviewQueue />
    </main>
  );
}
