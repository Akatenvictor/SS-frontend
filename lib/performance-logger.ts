import { logInfo } from "@/lib/logger";

export type PageName = "seller_dashboard" | "investor_portfolio";

export interface PagePerformanceMetrics {
    page_name: PageName;
    ttfb: number;
    dcl: number;
    load_complete: number;
}

/**
 * Reads the browser's Navigation Timing API entry for the current page.
 * Returns null when the API is unavailable (e.g. server-side rendering
 * or an environment without a completed navigation entry yet).
 */
export function collectNavigationTiming(pageName: PageName): PagePerformanceMetrics | null {
    if (typeof window === "undefined" || !window.performance) {
        return null;
    }

    const [entry] = window.performance.getEntriesByType(
        "navigation"
    ) as PerformanceNavigationTiming[];

    if (!entry) {
        return null;
    }

    return {
        page_name: pageName,
        ttfb: Math.round(entry.responseStart - entry.requestStart),
        dcl: Math.round(entry.domContentLoadedEventEnd - entry.startTime),
        load_complete: Math.round(entry.loadEventEnd - entry.startTime),
    };
}

/**
 * Logs page load performance metrics to the analytics logger.
 * Only logs in production so local development doesn't spam the console.
 */
export function logPageLoadPerformance(pageName: PageName): void {
    if (process.env.NODE_ENV !== "production") {
        return;
    }

    const metrics = collectNavigationTiming(pageName);
    if (!metrics) {
        return;
    }

    logInfo("page_load_performance", metrics);
}
