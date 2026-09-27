import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NotFound from "../not-found";
import GlobalError from "../error";
import * as logger from "@/lib/logger";

beforeEach(() => {
    vi.restoreAllMocks();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("NotFound", () => {
    it("renders the 'Page not found' message", () => {
        render(<NotFound />);

        expect(screen.getByText("Page not found")).toBeInTheDocument();
    });

    it("links 'Go to Marketplace' at the marketplace page", () => {
        render(<NotFound />);

        expect(screen.getByRole("link", { name: "Go to Marketplace" })).toHaveAttribute(
            "href",
            "/marketplace"
        );
    });

    it("does not log to the error logger — a bad URL is expected user behaviour", () => {
        const logErrorSpy = vi.spyOn(logger, "logError").mockImplementation(() => { });

        render(<NotFound />);

        expect(logErrorSpy).not.toHaveBeenCalled();
    });
});

describe("GlobalError", () => {
    const error = Object.assign(new Error("boom"), { digest: "abc123" });

    it("renders the error page instead of a blank screen", () => {
        vi.spyOn(logger, "logError").mockImplementation(() => { });

        render(<GlobalError error={error} reset={vi.fn()} />);

        expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    it("logs the unhandled render error to the client-side logger", () => {
        const logErrorSpy = vi.spyOn(logger, "logError").mockImplementation(() => { });

        render(<GlobalError error={error} reset={vi.fn()} />);

        expect(logErrorSpy).toHaveBeenCalledTimes(1);
        expect(logErrorSpy).toHaveBeenCalledWith("Unhandled render error", error);
    });

    it("links 'Go to Marketplace' at the marketplace page", () => {
        vi.spyOn(logger, "logError").mockImplementation(() => { });

        render(<GlobalError error={error} reset={vi.fn()} />);

        expect(screen.getByRole("link", { name: "Go to Marketplace" })).toHaveAttribute(
            "href",
            "/marketplace"
        );
    });

    it("retries the failed render through the router-provided reset callback", () => {
        vi.spyOn(logger, "logError").mockImplementation(() => { });
        const reset = vi.fn();

        render(<GlobalError error={error} reset={reset} />);
        fireEvent.click(screen.getByRole("button", { name: "Try again" }));

        expect(reset).toHaveBeenCalledTimes(1);
    });
});
