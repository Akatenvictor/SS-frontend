import { describe, it, expect, vi, afterEach } from "vitest";
import { collectNavigationTiming, logPageLoadPerformance } from "../performance-logger";
import * as logger from "../logger";

function mockNavigationEntry(overrides: Partial<PerformanceNavigationTiming> = {}) {
    const entry = {
        requestStart: 10,
        responseStart: 60,
        startTime: 0,
        domContentLoadedEventEnd: 200,
        loadEventEnd: 350,
        ...overrides,
    };

    vi.spyOn(window.performance, "getEntriesByType").mockReturnValue([
        entry,
    ] as unknown as PerformanceEntryList);

    return entry;
}

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
});

describe("collectNavigationTiming", () => {
    it("computes ttfb, dcl, and load_complete from the navigation entry", () => {
        mockNavigationEntry();

        const metrics = collectNavigationTiming("seller_dashboard");

        expect(metrics).toEqual({
            page_name: "seller_dashboard",
            ttfb: 50,
            dcl: 200,
            load_complete: 350,
        });
    });

    it("returns null when no navigation entry is available", () => {
        vi.spyOn(window.performance, "getEntriesByType").mockReturnValue([]);

        expect(collectNavigationTiming("investor_portfolio")).toBeNull();
    });
});

describe("logPageLoadPerformance", () => {
    it("logs metrics via the analytics logger in production", () => {
        vi.stubEnv("NODE_ENV", "production");
        mockNavigationEntry();
        const logInfoSpy = vi.spyOn(logger, "logInfo").mockImplementation(() => {});

        logPageLoadPerformance("seller_dashboard");

        expect(logInfoSpy).toHaveBeenCalledWith(
            "page_load_performance",
            expect.objectContaining({ page_name: "seller_dashboard" })
        );
    });

    it("does not log in development mode", () => {
        vi.stubEnv("NODE_ENV", "development");
        mockNavigationEntry();
        const logInfoSpy = vi.spyOn(logger, "logInfo").mockImplementation(() => {});

        logPageLoadPerformance("seller_dashboard");

        expect(logInfoSpy).not.toHaveBeenCalled();
    });
});
