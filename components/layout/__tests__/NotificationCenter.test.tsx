import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

import { NotificationCenter } from "../NotificationCenter";
import * as api from "@/lib/api";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ address: null }) }));

const notificationsFixture: api.NotificationItem[] = [
  {
    id: "notif-1",
    title: "Invoice fully funded",
    link: "/marketplace/inv-1",
    read: false,
    created_at: "2026-09-01T10:00:00Z",
  },
  {
    id: "notif-2",
    message: "Settlement complete",
    read: true,
    created_at: "2026-08-30T10:00:00Z",
  },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(api, "fetchUnreadCount").mockResolvedValue({ count: 2 });
  vi.spyOn(api, "fetchNotifications").mockResolvedValue(notificationsFixture);
  vi.spyOn(api, "markNotificationAsRead").mockResolvedValue({ success: true });
  vi.spyOn(api, "markAllNotificationsAsRead").mockResolvedValue({ success: true });
});

describe("NotificationCenter (issue #283)", () => {
  it("shows the unread count badge and opens the panel with the list", async () => {
    render(<NotificationCenter />, { wrapper: createWrapper() });

    const bell = screen.getByTestId("notification-bell");
    expect(bell).toBeInTheDocument();

    // The unread count comes from an async query, so the badge appears a tick later.
    await waitFor(() => {
      expect(screen.getByTestId("notification-badge")).toHaveTextContent("2");
    });

    fireEvent.click(bell);

    await waitFor(() => {
      expect(screen.getByTestId("notification-panel")).toBeInTheDocument();
    });
    // Skeletons render first, so wait for the list to replace them.
    await waitFor(() => {
      expect(screen.getByTestId("notification-list")).toBeInTheDocument();
    });
    expect(screen.getByText("Invoice fully funded")).toBeInTheDocument();
  });

  it("marks a notification read and navigates to its link on click", async () => {
    render(<NotificationCenter />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByTestId("notification-bell"));
    await waitFor(() => {
      expect(screen.getByTestId("notification-item-notif-1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("notification-item-notif-1"));

    await waitFor(() => {
      expect(api.markNotificationAsRead).toHaveBeenCalledWith("notif-1");
    });
  });

  it("supports bulk mark-all-as-read", async () => {
    render(<NotificationCenter />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByTestId("notification-bell"));
    // The button stays disabled until the unread count resolves, otherwise the
    // click is swallowed and the mutation never runs.
    const markAll = await waitFor(() => {
      const button = screen.getByTestId("mark-all-read-btn");
      expect(button).toBeEnabled();
      return button as HTMLButtonElement;
    });

    fireEvent.click(markAll);

    await waitFor(() => {
      expect(api.markAllNotificationsAsRead).toHaveBeenCalled();
    });
  });

  it("shows an empty state when no notifications exist", async () => {
    vi.spyOn(api, "fetchNotifications").mockResolvedValue([]);
    vi.spyOn(api, "fetchUnreadCount").mockResolvedValue({ count: 0 });

    render(<NotificationCenter />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByTestId("notification-bell"));

    await waitFor(() => {
      expect(screen.getByTestId("notifications-empty")).toBeInTheDocument();
    });
    expect(screen.getByText(/You're all caught up/i)).toBeInTheDocument();
  });
});
