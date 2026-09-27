"use client";

import { useEffect, useRef } from "react";
import { logPageLoadPerformance, type PageName } from "@/lib/performance-logger";

/**
 * Logs Navigation Timing performance metrics once per navigation to this
 * page. Waits for the `load` event so `load_complete` is populated, and
 * guards against duplicate logs from re-renders/strict-mode remounts.
 */
export function usePageLoadPerformanceLog(pageName: PageName): void {
    const hasLoggedRef = useRef(false);

    useEffect(() => {
        if (hasLoggedRef.current) {
            return;
        }

        function logOnce() {
            if (hasLoggedRef.current) {
                return;
            }
            hasLoggedRef.current = true;
            logPageLoadPerformance(pageName);
        }

        if (document.readyState === "complete") {
            logOnce();
            return;
        }

        window.addEventListener("load", logOnce, { once: true });
        return () => window.removeEventListener("load", logOnce);
    }, [pageName]);
}
