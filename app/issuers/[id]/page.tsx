"use client";

import { useParams } from "next/navigation";
import { IssuerProfile } from "@/components/issuers";

export default function IssuerProfilePage() {
  const params = useParams<{ id: string }>();
  const issuerId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  if (!issuerId) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div data-testid="issuer-not-found" className="py-20 text-center">
          <h1 className="text-2xl font-bold">Issuer not found</h1>
          <p className="text-muted-foreground">No issuer id was provided.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <IssuerProfile issuerId={issuerId} />
    </main>
  );
}
