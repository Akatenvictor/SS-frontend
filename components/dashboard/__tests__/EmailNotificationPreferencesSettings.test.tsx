import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { toast } from "sonner";
import { EmailNotificationPreferencesSettings } from "../EmailNotificationPreferencesSettings";
import * as api from "@/lib/api";

vi.mock("sonner", () => ({
    toast: { error: vi.fn(), success: vi.fn() },
}));

function renderWithClient(ui: ReactElement) {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const basePreferences: api.EmailNotificationPreference[] = [
    { event_type: "settlement", email: true },
    { event_type: "kyc_status", email: true },
    { event_type: "watchlist_invoice_match", email: false },
    { event_type: "secondary_market_sale", email: false },
    { event_type: "invoice_decision", email: false },
];

function mockFetch(preferences = basePreferences) {
    return vi.spyOn(api, "fetchEmailNotificationPreferences").mockResolvedValue(preferences);
}

function mockSave(implementation: () => Promise<{ success: boolean }> = async () => ({ success: true })) {
    return vi.spyOn(api, "saveEmailNotificationPreferences").mockImplementation(implementation);
}

// The sonner module mock holds stable vi.fn()s that survive restoreAllMocks,
// so call history is cleared explicitly.
beforeEach(() => {
    vi.clearAllMocks();
});

afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
});

describe("EmailNotificationPreferencesSettings", () => {
    it("shows a loading state while preferences are fetched", () => {
        vi.spyOn(api, "fetchEmailNotificationPreferences").mockReturnValue(new Promise(() => {}));

        renderWithClient(<EmailNotificationPreferencesSettings />);

        expect(screen.getByTestId("email-preferences-loading")).toBeInTheDocument();
    });

    it("renders every notification type with its current toggle state", async () => {
        mockFetch();

        renderWithClient(<EmailNotificationPreferencesSettings />);

        await screen.findByTestId("email-preference-settlement");

        expect(screen.getByLabelText("Email notifications for Settlement")).toHaveAttribute(
            "aria-checked",
            "true"
        );
        expect(screen.getByLabelText("Email notifications for KYC status")).toHaveAttribute(
            "aria-checked",
            "true"
        );
        expect(
            screen.getByLabelText("Email notifications for Watchlist matches")
        ).toHaveAttribute("aria-checked", "false");
        expect(
            screen.getByLabelText("Email notifications for Secondary market sales")
        ).toHaveAttribute("aria-checked", "false");
        expect(
            screen.getByLabelText("Email notifications for Invoice decisions")
        ).toHaveAttribute("aria-checked", "false");
    });

    it("disables the save button until something changes", async () => {
        mockFetch();

        renderWithClient(<EmailNotificationPreferencesSettings />);

        const save = await screen.findByTestId("save-email-preferences");
        expect(save).toBeDisabled();
        expect(screen.queryByTestId("email-preferences-unsaved")).not.toBeInTheDocument();
    });

    it("saves every toggled change in a single request and confirms with a toast", async () => {
        mockFetch();
        const saveSpy = mockSave();

        renderWithClient(<EmailNotificationPreferencesSettings />);

        fireEvent.click(await screen.findByTestId("email-preference-settlement"));
        fireEvent.click(screen.getByTestId("email-preference-secondary_market_sale"));

        const save = screen.getByTestId("save-email-preferences");
        expect(save).toBeEnabled();
        fireEvent.click(save);

        await waitFor(() => expect(saveSpy).toHaveBeenCalledTimes(1));
        expect(saveSpy).toHaveBeenCalledWith([
            { event_type: "settlement", email: false },
            { event_type: "kyc_status", email: true },
            { event_type: "watchlist_invoice_match", email: false },
            { event_type: "secondary_market_sale", email: true },
            { event_type: "invoice_decision", email: false },
        ]);
        await waitFor(() =>
            expect(toast.success).toHaveBeenCalledWith("Notification preferences saved")
        );
    });

    it("does not send a request before save is pressed", async () => {
        mockFetch();
        const saveSpy = mockSave();

        renderWithClient(<EmailNotificationPreferencesSettings />);

        fireEvent.click(await screen.findByTestId("email-preference-settlement"));

        expect(saveSpy).not.toHaveBeenCalled();
    });

    it("enables all notification types with the bulk control", async () => {
        mockFetch();
        const saveSpy = mockSave();

        renderWithClient(<EmailNotificationPreferencesSettings />);

        await screen.findByTestId("email-preference-settlement");
        fireEvent.click(screen.getByTestId("enable-all"));

        await waitFor(() =>
            expect(screen.getByTestId("email-preferences-summary")).toHaveTextContent(
                "5 of 5 enabled"
            )
        );
        expect(screen.getByLabelText("Email notifications for Watchlist matches")).toHaveAttribute(
            "aria-checked",
            "true"
        );

        fireEvent.click(screen.getByTestId("save-email-preferences"));

        await waitFor(() => expect(saveSpy).toHaveBeenCalledTimes(1));
        expect(
            saveSpy.mock.calls[0][0].every((pref: api.EmailNotificationPreference) => pref.email)
        ).toBe(true);
    });

    it("disables all notification types with the bulk control", async () => {
        mockFetch();
        const saveSpy = mockSave();

        renderWithClient(<EmailNotificationPreferencesSettings />);

        await screen.findByTestId("email-preference-settlement");
        fireEvent.click(screen.getByTestId("disable-all"));

        await waitFor(() =>
            expect(screen.getByTestId("email-preferences-summary")).toHaveTextContent(
                "0 of 5 enabled"
            )
        );

        fireEvent.click(screen.getByTestId("save-email-preferences"));

        await waitFor(() => expect(saveSpy).toHaveBeenCalledTimes(1));
        expect(
            saveSpy.mock.calls[0][0].some((pref: api.EmailNotificationPreference) => pref.email)
        ).toBe(false);
    });

    it("toggles every type from the master switch", async () => {
        mockFetch();

        renderWithClient(<EmailNotificationPreferencesSettings />);

        await screen.findByTestId("email-preference-settlement");
        expect(screen.getByTestId("toggle-all")).toHaveAttribute("data-state", "unchecked");

        fireEvent.click(screen.getByTestId("toggle-all"));

        await waitFor(() =>
            expect(screen.getByTestId("toggle-all")).toHaveAttribute("data-state", "checked")
        );
    });

    it("shows an error with a retry action when the save fails", async () => {
        mockFetch();
        mockSave(async () => {
            throw new Error("network error");
        });

        renderWithClient(<EmailNotificationPreferencesSettings />);

        fireEvent.click(await screen.findByTestId("email-preference-settlement"));
        fireEvent.click(screen.getByTestId("save-email-preferences"));

        const alert = await screen.findByTestId("email-preferences-save-error");
        expect(alert).toBeInTheDocument();
        expect(toast.success).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalled();
        expect(screen.getByTestId("email-preferences-retry-save")).toBeInTheDocument();
    });

    it("recovers when the retry succeeds", async () => {
        mockFetch();
        let attempt = 0;
        const saveSpy = vi
            .spyOn(api, "saveEmailNotificationPreferences")
            .mockImplementation(async () => {
                attempt += 1;
                if (attempt === 1) throw new Error("network error");
                return { success: true };
            });

        renderWithClient(<EmailNotificationPreferencesSettings />);

        fireEvent.click(await screen.findByTestId("email-preference-settlement"));
        fireEvent.click(screen.getByTestId("save-email-preferences"));

        await screen.findByTestId("email-preferences-save-error");
        fireEvent.click(screen.getByTestId("email-preferences-retry-save"));

        await waitFor(() => expect(saveSpy).toHaveBeenCalledTimes(2));
        await waitFor(() =>
            expect(screen.queryByTestId("email-preferences-save-error")).not.toBeInTheDocument()
        );
        expect(toast.success).toHaveBeenCalled();
    });

    it("shows a load error with retry when fetching preferences fails", async () => {
        vi.spyOn(api, "fetchEmailNotificationPreferences").mockRejectedValue(
            new Error("network error")
        );

        renderWithClient(<EmailNotificationPreferencesSettings />);

        expect(await screen.findByTestId("email-preferences-load-error")).toBeInTheDocument();
        expect(screen.getByTestId("email-preferences-retry")).toBeInTheDocument();
    });

    it("keeps the save button disabled when the draft matches the server", async () => {
        mockFetch();
        mockSave();

        renderWithClient(<EmailNotificationPreferencesSettings />);

        const settlement = await screen.findByTestId("email-preference-settlement");
        fireEvent.click(settlement);
        fireEvent.click(screen.getByTestId("save-email-preferences"));

        await waitFor(() => expect(toast.success).toHaveBeenCalled());
        // The draft now matches what was persisted, so there is nothing to save.
        expect(screen.getByTestId("save-email-preferences")).toBeDisabled();
    });
});
