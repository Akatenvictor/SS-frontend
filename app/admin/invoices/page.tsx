"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AdminInvoicesReview } from "@/components/admin/AdminInvoicesReview";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

interface JwtPayload {
  role?: string;
  exp?: number;
  [key: string]: any;
}

function parseJwt(token: string): JwtPayload | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export default function AdminInvoicesPage() {
  const { jwt, isConnecting } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (isConnecting) return;

    if (!jwt) {
      setIsAdmin(false);
      return;
    }

    const payload = parseJwt(jwt);
    if (payload && payload.role === "admin") {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  }, [jwt, isConnecting]);

  if (isConnecting || isAdmin === null) {
    return null;
  }

  if (!isAdmin) {
    return (
      <main className="container mx-auto px-4 py-16 flex justify-center">
        <Card className="max-w-md w-full" data-testid="unauthorized-card">
          <CardContent className="pt-6 flex flex-col items-center text-center space-y-3">
            <ShieldAlert className="size-12 text-destructive" />
            <h1 className="text-xl font-bold">Access Denied</h1>
            <p className="text-sm text-muted-foreground">
              You must be logged in as an admin user to access this page.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Admin Invoice Management</h1>
      <AdminInvoicesReview />
    </main>
  );
}
