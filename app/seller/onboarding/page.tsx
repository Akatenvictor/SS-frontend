"use client";
import { SellerOnboarding } from "@/components/onboarding/SellerOnboarding";
import { useRouter } from "next/navigation";
export default function SellerOnboardingPage() { const r = useRouter(); return <main className="container mx-auto px-4 py-12"><SellerOnboarding onComplete={() => r.push("/seller")} /></main>; }
