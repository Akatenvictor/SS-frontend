import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePageLoadPerformanceLog } from "../usePageLoadPerformanceLog";
import * as performanceLogger from "@/lib/performance-logger";

afterEach(() => {
    vi.restoreAllMocks();
});

describe("usePageLoadPerformanceLog", () => {
    it("logs performance once the document has finished loading", () => {
        Object.defineProperty(document, "readyState", {
            configurable: true,
            get: () => "complete",
        });
        const logSpy = vi
            .spyOn(performanceLogger, "logPageLoadPerformance")
            .mockImplementation(() => {});

        renderHook(() => usePageLoadPerformanceLog("seller_dashboard"));

        expect(logSpy).toHaveBeenCalledTimes(1);
        expect(logSpy).toHaveBeenCalledWith("seller_dashboard");
    });

    it("logs only once per mount even if the effect re-runs on rerender", () => {
        Object.defineProperty(document, "readyState", {
            configurable: true,
            get: () => "complete",
        });
        const logSpy = vi
            .spyOn(performanceLogger, "logPageLoadPerformance")
            .mockImplementation(() => {});

        const { rerender } = renderHook(
            ({ pageName }) => usePageLoadPerformanceLog(pageName),
            { initialProps: { pageName: "seller_dashboard" as const } }
        );
        rerender({ pageName: "seller_dashboard" as const });
        rerender({ pageName: "seller_dashboard" as const });

        expect(logSpy).toHaveBeenCalledTimes(1);
    });

    it("waits for the window load event when the document is still loading", () => {
        Object.defineProperty(document, "readyState", {
            configurable: true,
            get: () => "loading",
        });
        const logSpy = vi
            .spyOn(performanceLogger, "logPageLoadPerformance")
            .mockImplementation(() => {});

        renderHook(() => usePageLoadPerformanceLog("investor_portfolio"));

        expect(logSpy).not.toHaveBeenCalled();

        window.dispatchEvent(new Event("load"));

        expect(logSpy).toHaveBeenCalledTimes(1);
        expect(logSpy).toHaveBeenCalledWith("investor_portfolio");
    });
});
