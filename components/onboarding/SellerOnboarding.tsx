"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Step = "personal" | "business" | "documents" | "review";
const STEPS: Step[] = ["personal", "business", "documents", "review"];

export function SellerOnboarding({ onComplete }: { onComplete?: () => void }) {
  const [step, setStep] = useState(0);
  const [p, setP] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [b, setB] = useState({ businessName: "", businessType: "", registrationNumber: "", country: "" });
  const [d, setD] = useState({ idDocumentCid: null as string | null, businessRegCid: null as string | null, idFileName: "", bizFileName: "" });
  const submit = useMutation({ mutationFn: async () => { const res = await fetch("/api/kyc/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ personal: p, business: b, documents: d }) }); if (!res.ok) throw new Error("Failed"); return res.json(); }, onSuccess: () => onComplete?.() });
  const ok = step === 0 ? !!(p.firstName && p.lastName && p.email) : step === 1 ? !!(b.businessName && b.country) : step === 2 ? !!(d.idDocumentCid || d.idFileName) : true;
  return (<Card className="max-w-2xl mx-auto"><CardHeader><CardTitle>Seller Onboarding</CardTitle><div className="flex gap-2 mt-4">{STEPS.map((s, i) => <div key={s} className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${i < step ? "bg-green-500 text-white" : i === step ? "border-2 border-primary" : "border border-muted-foreground/30"}`}>{i < step ? "✓" : i + 1}</div>)}</div></CardHeader><CardContent className="space-y-4">
    {step === 0 && <><div className="grid grid-cols-2 gap-4"><div><Label>First Name *</Label><Input value={p.firstName} onChange={(e) => setP({ ...p, firstName: e.target.value })} /></div><div><Label>Last Name *</Label><Input value={p.lastName} onChange={(e) => setP({ ...p, lastName: e.target.value })} /></div></div><div><Label>Email *</Label><Input type="email" value={p.email} onChange={(e) => setP({ ...p, email: e.target.value })} /></div><div><Label>Phone</Label><Input value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} /></div></>}
    {step === 1 && <><div><Label>Business Name *</Label><Input value={b.businessName} onChange={(e) => setB({ ...b, businessName: e.target.value })} /></div><div className="grid grid-cols-2 gap-4"><div><Label>Business Type</Label><Input value={b.businessType} onChange={(e) => setB({ ...b, businessType: e.target.value })} /></div><div><Label>Registration No.</Label><Input value={b.registrationNumber} onChange={(e) => setB({ ...b, registrationNumber: e.target.value })} /></div></div><div><Label>Country *</Label><Input value={b.country} onChange={(e) => setB({ ...b, country: e.target.value })} /></div></>}
    {step === 2 && <><div><Label>ID Document *</Label><Input type="file" accept=".pdf,.jpg,.png" onChange={(e) => { const f = e.target.files?.[0]; if (f) setD({ ...d, idFileName: f.name, idDocumentCid: `ipfs-${f.name}` }); }} />{d.idFileName && <p className="text-xs text-green-600 mt-1">Uploaded: {d.idFileName}</p>}</div><div><Label>Business Registration</Label><Input type="file" accept=".pdf,.jpg,.png" onChange={(e) => { const f = e.target.files?.[0]; if (f) setD({ ...d, bizFileName: f.name, businessRegCid: `ipfs-${f.name}` }); }} />{d.bizFileName && <p className="text-xs text-green-600 mt-1">Uploaded: {d.bizFileName}</p>}</div></>}
    {step === 3 && <div className="space-y-2 text-sm"><div className="rounded-lg bg-muted p-3"><p className="font-semibold">Personal</p><p>{p.firstName} {p.lastName} — {p.email}</p></div><div className="rounded-lg bg-muted p-3"><p className="font-semibold">Business</p><p>{b.businessName} ({b.country})</p></div><div className="rounded-lg bg-muted p-3"><p className="font-semibold">Documents</p><p>ID: {d.idFileName || "—"} | Biz: {d.bizFileName || "—"}</p></div></div>}
    <div className="flex justify-between mt-6"><Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>Back</Button>{step < 3 ? <Button onClick={() => setStep(step + 1)} disabled={!ok}>Next</Button> : <Button onClick={() => submit.mutate()} disabled={submit.isPending}>{submit.isPending ? "Submitting…" : "Submit KYC"}</Button>}</div>
  </CardContent></Card>);
}
