"use client";

import { HelpCentre } from "@/components/help/HelpCentre";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function HelpCentrePage() {
  usePageTitle("Help Centre");

  return <HelpCentre />;
}
