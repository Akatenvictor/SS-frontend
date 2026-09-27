import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { ShareInvoiceButton } from "../ShareInvoiceButton";

const INVOICE_URL = "https://stellarsettle.test/marketplace/invoice-42";

/** Replace `window.location.href` with a known invoice URL for the test. */
function stubLocation(href: string) {
    Object.defineProperty(window, "location", {
        configurable: true,
        value: { ...window.location, href },
    });
}

/** Install a clipboard stub, or remove the API entirely to test the fallback. */
function stubClipboard(clipboard: Partial<Clipboard> | undefined) {
    Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: clipboard,
    });
}

beforeEach(() => {
    stubLocation(INVOICE_URL);
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe("ShareInvoiceButton", () => {
    it("copies the full invoice URL to the clipboard on click", async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        stubClipboard({ writeText });

        render(<ShareInvoiceButton />);
        fireEvent.click(screen.getByRole("button", { name: "Share invoice" }));

        await waitFor(() => expect(writeText).toHaveBeenCalledWith(INVOICE_URL));
    });

    it("shows 'Copied!' for 2 seconds, then reverts to the icon", async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        const writeText = vi.fn().mockResolvedValue(undefined);
        stubClipboard({ writeText });

        render(<ShareInvoiceButton />);
        expect(screen.getByTestId("share-icon")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Share invoice" }));

        await waitFor(() => expect(screen.getByText("Copied!")).toBeInTheDocument());
        expect(screen.queryByTestId("share-icon")).not.toBeInTheDocument();

        // Just short of the window the confirmation is still up...
        act(() => {
            vi.advanceTimersByTime(1_900);
        });
        expect(screen.getByText("Copied!")).toBeInTheDocument();

        // ...and once it elapses the icon comes back.
        act(() => {
            vi.advanceTimersByTime(200);
        });
        expect(screen.queryByText("Copied!")).not.toBeInTheDocument();
        expect(screen.getByTestId("share-icon")).toBeInTheDocument();
    });

    it("falls back to a prompt pre-filled with the URL when the Clipboard API is unavailable", () => {
        stubClipboard(undefined);
        const promptSpy = vi.spyOn(window, "prompt").mockReturnValue(null);

        render(<ShareInvoiceButton />);
        fireEvent.click(screen.getByRole("button", { name: "Share invoice" }));

        expect(promptSpy).toHaveBeenCalledWith("Copy this invoice link:", INVOICE_URL);
        expect(screen.queryByText("Copied!")).not.toBeInTheDocument();
    });

    it("falls back to a prompt when the clipboard write is rejected", async () => {
        stubClipboard({ writeText: vi.fn().mockRejectedValue(new Error("denied")) });
        const promptSpy = vi.spyOn(window, "prompt").mockReturnValue(null);

        render(<ShareInvoiceButton />);
        fireEvent.click(screen.getByRole("button", { name: "Share invoice" }));

        await waitFor(() =>
            expect(promptSpy).toHaveBeenCalledWith("Copy this invoice link:", INVOICE_URL)
        );
    });

    it("renders nothing in an SSR context, where window is undefined", () => {
        expect(renderToString(<ShareInvoiceButton />)).toBe("");
    });

    it("copies a URL that points back at the same invoice detail page", async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        stubClipboard({ writeText });

        render(<ShareInvoiceButton />);
        fireEvent.click(screen.getByRole("button", { name: "Share invoice" }));

        await waitFor(() => expect(writeText).toHaveBeenCalled());
        const copied = new URL(writeText.mock.calls[0][0]);
        expect(copied.pathname).toBe("/marketplace/invoice-42");
    });
});
