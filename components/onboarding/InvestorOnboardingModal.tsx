"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const KEY = "ss-investor-onboarded"; const TKEY = "ss-terms-version"; const TV = "1.0";
function onboarded() { if (typeof window === "undefined") return false; return localStorage.getItem(KEY) === "true" && localStorage.getItem(TKEY) === TV; }

export function InvestorOnboardingModal({ onComplete }: { onComplete?: () => void }) {
  const [step, setStep] = useState(0);
  const [ack, setAck] = useState({ risks: false, acc: false });
  const done = useMutation({ mutationFn: async () => { localStorage.setItem(KEY, "true"); localStorage.setItem(TKEY, TV); }, onSuccess: () => onComplete?.() });
  const steps = ["overview", "risk", "accreditation", "confirm"];
  return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto"><CardHeader><CardTitle>Investor Onboarding</CardTitle><div className="flex justify-center gap-2 mt-4">{steps.map((_, i) => <div key={i} className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i < step ? "bg-green-500 text-white" : i === step ? "border-2 border-primary" : "border border-muted-foreground/30"}`}>{i < step ? "✓" : i + 1}</div>)}</div></CardHeader><CardContent className="space-y-4">
    {step === 0 && <div className="space-y-3 text-sm"><h3 className="font-semibold text-base">Welcome to StellarState</h3><p>Decentralized invoice factoring on Stellar.</p><ul className="list-disc pl-5 text-muted-foreground"><li>Investments in XLM against invoices</li><li>Returns depend on settlement</li><li>Funds locked until maturity</li><li>Smart contract risk exists</li></ul></div>}
    {step === 1 && <div className="space-y-3 text-sm"><h3 className="font-semibold">Risk Disclosure</h3><div className="rounded-md bg-amber-50 p-3 text-amber-800 text-xs">Not financial advice. Invest only what you can afford to lose.</div><ul className="list-disc pl-5 text-muted-foreground"><li><strong>Credit risk:</strong> Debtor may default</li><li><strong>Liquidity:</strong> Funds locked</li><li><strong>Smart contract risk</strong></li><li><strong>Market risk:</strong> XLM volatility</li></ul><label className="flex items-center gap-2 mt-4 cursor-pointer"><input type="checkbox" checked={ack.risks} onChange={(e) => setAck({ ...ack, risks: e.target.checked })} className="h-4 w-4" /><span className="text-sm font-medium">I understand the risks</span></label></div>}
    {step === 2 && <div className="space-y-3 text-sm"><h3 className="font-semibold">Accreditation</h3><ul className="list-disc pl-5 text-muted-foreground"><li>You meet accredited investor qualifications</li><li>You understand this is speculative</li><li>You did your own due diligence</li></ul><label className="flex items-center gap-2 mt-4 cursor-pointer"><input type="checkbox" checked={ack.acc} onChange={(e) => setAck({ ...ack, acc: e.target.checked })} className="h-4 w-4" /><span className="text-sm font-medium">I acknowledge my accreditation</span></label></div>}
    {step === 3 && <div className="text-center text-sm"><h3 className="font-semibold text-base">You&apos;re All Set</h3><p className="text-muted-foreground">You can now invest on StellarState.</p></div>}
    <div className="flex justify-between pt-4"><Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>Back</Button>{step < 3 ? <Button onClick={() => setStep(step + 1)} disabled={step === 1 && !ack.risks}>Next</Button> : <Button onClick={() => done.mutate()} disabled={!ack.risks || !ack.acc}>Start Investing</Button>}</div>
  </CardContent></Card></div>);
}
export { onboarded };
