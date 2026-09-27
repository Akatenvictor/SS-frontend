import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  useNotifications,
  useUnreadCount,
  useMarkNotificationRead,
  NOTIFICATIONS_QUERY_KEY,
  UNREAD_COUNT_QUERY_KEY,
} from "../useNotifications";
import * as api from "@/lib/api";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const initialNotifications: api.NotificationItem[] = [
  { id: "notif-1", message: "Invoice funded", read: false },
  { id: "notif-2", message: "Settlement complete", read: false },
];

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useMarkNotificationRead optimistic updates", () => {
  it("clears unread indicator immediately and decrements nav bell count optimistically before server response", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    // Populate initial cache
    queryClient.setQueryData(NOTIFICATIONS_QUERY_KEY, initialNotifications);
    queryClient.setQueryData(UNREAD_COUNT_QUERY_KEY, { count: 2 });

    let resolveMutation: (val: any) => void = () => {};
    const mutationPromise = new Promise((res) => {
      resolveMutation = res;
    });
    vi.spyOn(api, "markNotificationAsRead").mockReturnValue(mutationPromise as any);

    const { result } = renderHook(() => useMarkNotificationRead(), {
      wrapper: createWrapper(queryClient),
    });

    // Trigger mark as read for notif-1
    act(() => {
      result.current.mutate("notif-1");
    });

    // Verify optimistic state in query cache BEFORE server response resolves
    await waitFor(() => {
      const updatedList = queryClient.getQueryData<api.NotificationItem[]>(NOTIFICATIONS_QUERY_KEY);
      expect(updatedList?.find((n) => n.id === "notif-1")?.read).toBe(true);

      const updatedCount = queryClient.getQueryData<{ count: number }>(UNREAD_COUNT_QUERY_KEY);
      expect(updatedCount?.count).toBe(1);
    });

    // Resolve server response
    await act(async () => {
      resolveMutation({ success: true });
    });
  });

  it("restores unread state and nav bell count on mutation rollback when request fails", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    // Populate initial cache
    queryClient.setQueryData(NOTIFICATIONS_QUERY_KEY, initialNotifications);
    queryClient.setQueryData(UNREAD_COUNT_QUERY_KEY, { count: 2 });

    vi.spyOn(api, "markNotificationAsRead").mockRejectedValue(new Error("Network failure"));

    const { result } = renderHook(() => useMarkNotificationRead(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.mutate("notif-1");
    });

    // Verify rollback occurs after failure
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to mark notification as read");

      const rolledBackList = queryClient.getQueryData<api.NotificationItem[]>(NOTIFICATIONS_QUERY_KEY);
      expect(rolledBackList?.find((n) => n.id === "notif-1")?.read).toBe(false);

      const rolledBackCount = queryClient.getQueryData<{ count: number }>(UNREAD_COUNT_QUERY_KEY);
      expect(rolledBackCount?.count).toBe(2);
    });
  });

  it("invalidates notification list and unread count cache when mutation settles", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    vi.spyOn(api, "markNotificationAsRead").mockResolvedValue({ success: true });

    const { result } = renderHook(() => useMarkNotificationRead(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate("notif-1");
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: NOTIFICATIONS_QUERY_KEY });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: UNREAD_COUNT_QUERY_KEY });
    });
  });
});
