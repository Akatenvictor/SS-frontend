"use client";

import { useCallback, useEffect, useState } from "react";
import {
  SUITABILITY_CHANGE_EVENT,
  SUITABILITY_STORAGE_KEY,
  loadSuitabilityTier,
  saveSuitabilityTier,
  type SuitabilityTier,
} from "@/lib/suitability";

/** Current investor suitability tier, kept in sync across components/tabs (#391). */
export function useSuitabilityTier() {
  const [tier, setTierState] = useState<SuitabilityTier | null>(null);

  useEffect(() => {
    setTierState(loadSuitabilityTier());
    const onChange = () => setTierState(loadSuitabilityTier());
    const onStorage = (e: StorageEvent) => {
      if (e.key === SUITABILITY_STORAGE_KEY) onChange();
    };
    window.addEventListener(SUITABILITY_CHANGE_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(SUITABILITY_CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setTier = useCallback((next: SuitabilityTier) => {
    saveSuitabilityTier(next);
    setTierState(next);
  }, []);

  return { tier, setTier };
}
