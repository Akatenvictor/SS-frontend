"use client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
type KS = "pending" | "approved" | "rejected";
const C: Record<KS, { l: string; c: string; b: string }> = { pending: { l: "Under Review", c: "text-amber-700", b: "bg-amber-100" }, approved: { l: "Approved", c: "text-green-700", b: "bg-green-100" }, rejected: { l: "Rejected", c: "text-red-700", b: "bg-red-100" } };
export default function KycStatusPage() {
  const { data, isLoading } = useQuery<{ status: KS; submittedAt: string; reviewedAt?: string; rejectionReason?: string }>({ queryKey: ["kyc-status"], queryFn: async () => { const r = await fetch("/api/kyc/status"); if (!r.ok) throw new Error("Failed"); return r.json(); }, refetchInterval: 60_000 });
  if (isLoading) return <div className="container mx-auto max-w-lg px-4 py-12"><Card><CardContent className="p-8 text-center text-muted-foreground">Loading…</CardContent></Card></div>;
  const s = data?.status ?? "pending"; const cfg = C[s];
  return (<div className="container mx-auto max-w-lg px-4 py-12"><Card><CardHeader><CardTitle>KYC Verification Status</CardTitle></CardHeader><CardContent className="space-y-4"><div className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${cfg.b} ${cfg.c}`}>{cfg.l}</div><p className="text-sm text-muted-foreground">Submitted: {data?.submittedAt ? new Date(data.submittedAt).toLocaleDateString() : "—"}</p>{s === "rejected" && data?.rejectionReason && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700"><p className="font-semibold">Rejection reason:</p><p>{data.rejectionReason}</p></div>}{s === "rejected" && <Link href="/kyc/reapply"><Button className="w-full">Resubmit KYC</Button></Link>}{s === "pending" && <p className="text-xs text-muted-foreground text-center">Refreshes every 60s.</p>}</CardContent></Card></div>);
}
