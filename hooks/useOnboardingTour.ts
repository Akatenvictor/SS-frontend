"use client";

import { useCallback, useEffect, useState } from "react";

export const ONBOARDING_TOUR_STORAGE_KEY = "stellarsettle.onboarding-tour-completed";
export const ONBOARDING_TOUR_REPLAY_EVENT = "stellarsettle:replay-onboarding-tour";

export function isOnboardingTourCompleted(): boolean {
  try {
    return window.localStorage.getItem(ONBOARDING_TOUR_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function markOnboardingTourCompleted(): void {
  try {
    window.localStorage.setItem(ONBOARDING_TOUR_STORAGE_KEY, "true");
  } catch {
    // Storage unavailable — tour will simply show again.
  }
}

export function clearOnboardingTourCompleted(): void {
  try {
    window.localStorage.removeItem(ONBOARDING_TOUR_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function requestOnboardingTourReplay(): void {
  if (typeof window === "undefined") return;
  clearOnboardingTourCompleted();
  window.dispatchEvent(new CustomEvent(ONBOARDING_TOUR_REPLAY_EVENT));
}

/**
 * Controls visibility of the first-visit platform tour (issue #349).
 * Tour auto-starts for unauthenticated visitors who have never completed it.
 */
export function useOnboardingTour(isAuthenticated: boolean) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const start = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const complete = useCallback(() => {
    markOnboardingTourCompleted();
    setIsActive(false);
  }, []);

  const skip = useCallback(() => {
    markOnboardingTourCompleted();
    setIsActive(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated || typeof window === "undefined") return;
    if (isOnboardingTourCompleted()) return;
    // Defer one tick so the landing UI mounts before the overlay appears.
    const t = window.setTimeout(() => setIsActive(true), 300);
    return () => window.clearTimeout(t);
  }, [isAuthenticated]);

  useEffect(() => {
    const onReplay = () => start();
    window.addEventListener(ONBOARDING_TOUR_REPLAY_EVENT, onReplay);
    return () => window.removeEventListener(ONBOARDING_TOUR_REPLAY_EVENT, onReplay);
  }, [start]);

  return { isActive, currentStep, setCurrentStep, start, complete, skip };
}
