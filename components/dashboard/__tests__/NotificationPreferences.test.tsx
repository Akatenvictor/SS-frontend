import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { NotificationPreferences } from "../NotificationPreferences";
import * as api from "@/lib/api";
import { toast } from "sonner";

vi.mock("sonner", () => ({
    toast: { error: vi.fn(), success: vi.fn() },
}));

function renderWithClient(ui: ReactElement) {
    const client = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const basePreferences: api.NotificationPreference[] = [
    { event_type: "new_invoice", email: true, in_app: false },
    { event_type: "funding_milestone", email: false, in_app: true },
    { event_type: "settlement", email: true, in_app: true },
];

beforeEach(() => {
    vi.restoreAllMocks();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("NotificationPreferences", () => {
    it("shows a loading state while the initial fetch is in progress", () => {
        vi.spyOn(api, "fetchNotificationPreferences").mockReturnValue(new Promise(() => {}));

        renderWithClient(<NotificationPreferences />);

        expect(screen.getByTestId("notification-preferences-loading")).toBeInTheDocument();
    });

    it("reflects current preferences once loaded", async () => {
        vi.spyOn(api, "fetchNotificationPreferences").mockResolvedValue(basePreferences);

        renderWithClient(<NotificationPreferences />);

        const emailToggle = await screen.findByLabelText("Email notifications for New invoice");
        const inAppToggle = screen.getByLabelText("In-app notifications for New invoice");

        expect(emailToggle).toHaveAttribute("aria-checked", "true");
        expect(inAppToggle).toHaveAttribute("aria-checked", "false");
    });

    it("saves immediately on toggle with no save button", async () => {
        vi.spyOn(api, "fetchNotificationPreferences").mockResolvedValue(basePreferences);
        const updateSpy = vi
            .spyOn(api, "updateNotificationPreference")
            .mockResolvedValue({ success: true });

        renderWithClient(<NotificationPreferences />);

        const toggle = await screen.findByLabelText("In-app notifications for New invoice");
        fireEvent.click(toggle);

        expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
        await waitFor(() =>
            expect(updateSpy).toHaveBeenCalledWith("new_invoice", "in_app", true)
        );
    });

    it("applies the toggle optimistically before the request resolves", async () => {
        vi.spyOn(api, "fetchNotificationPreferences").mockResolvedValue(basePreferences);
        vi.spyOn(api, "updateNotificationPreference").mockReturnValue(new Promise(() => {}));

        renderWithClient(<NotificationPreferences />);

        const toggle = await screen.findByLabelText("In-app notifications for New invoice");
        expect(toggle).toHaveAttribute("aria-checked", "false");

        fireEvent.click(toggle);

        await waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "true"));
    });

    it("rolls back the toggle and shows an error toast when the save fails", async () => {
        vi.spyOn(api, "fetchNotificationPreferences").mockResolvedValue(basePreferences);
        vi.spyOn(api, "updateNotificationPreference").mockRejectedValue(new Error("network error"));

        renderWithClient(<NotificationPreferences />);

        const toggle = await screen.findByLabelText("In-app notifications for New invoice");
        fireEvent.click(toggle);

        await waitFor(() => expect(toast.error).toHaveBeenCalled());
        expect(toggle).toHaveAttribute("aria-checked", "false");
    });

    it("groups seller and investor event types into separate sections", async () => {
        vi.spyOn(api, "fetchNotificationPreferences").mockResolvedValue(basePreferences);

        renderWithClient(<NotificationPreferences />);

        const sellerGroup = await screen.findByRole("region", { name: "Seller events" });
        const investorGroup = screen.getByRole("region", { name: "Investor events" });

        expect(
            within(sellerGroup).getByLabelText("Email notifications for Invoice funded")
        ).toBeInTheDocument();
        expect(
            within(sellerGroup).getByLabelText("Email notifications for Invoice settled")
        ).toBeInTheDocument();
        expect(
            within(sellerGroup).getByLabelText("Email notifications for Invoice rejected")
        ).toBeInTheDocument();
        expect(
            within(sellerGroup).getByLabelText("Email notifications for Deadline extended")
        ).toBeInTheDocument();

        expect(
            within(investorGroup).getByLabelText("Email notifications for New invoice")
        ).toBeInTheDocument();
        expect(
            within(investorGroup).getByLabelText("Email notifications for Funding milestone")
        ).toBeInTheDocument();
        expect(
            within(investorGroup).getByLabelText("Email notifications for Settlement")
        ).toBeInTheDocument();
        expect(
            within(investorGroup).getByLabelText("Email notifications for Invoice matured")
        ).toBeInTheDocument();
    });

    it("lists every event type with disabled toggles when the API omits it", async () => {
        vi.spyOn(api, "fetchNotificationPreferences").mockResolvedValue([basePreferences[0]]);

        renderWithClient(<NotificationPreferences />);

        const deadlineToggle = await screen.findByLabelText(
            "Email notifications for Deadline extended"
        );
        expect(deadlineToggle).toHaveAttribute("aria-checked", "false");
        expect(
            screen.getByLabelText("In-app notifications for Invoice matured")
        ).toHaveAttribute("aria-checked", "false");
    });

    it("saves a toggle for an event type the API did not return", async () => {
        const updateSpy = vi
            .spyOn(api, "updateNotificationPreference")
            .mockResolvedValue({ success: true });
        vi.spyOn(api, "fetchNotificationPreferences").mockResolvedValue([]);

        renderWithClient(<NotificationPreferences />);

        fireEvent.click(await screen.findByLabelText("Email notifications for Invoice matured"));

        await waitFor(() => expect(updateSpy).toHaveBeenCalledWith("invoice_matured", "email", true));
    });
});
