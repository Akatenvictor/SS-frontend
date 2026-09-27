import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  useInvoiceStatusPolling,
  isTerminalInvoiceStatus,
  statusChangeMessage,
  INVOICE_STATUS_POLL_INTERVAL_MS,
} from "../useInvoiceStatusPolling";
import * as api from "@/lib/api";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function invoiceDetail(status: api.Invoice["status"]): api.InvoiceDetail {
  return {
    id: "inv-1",
    title: "Test Invoice",
    seller: "Seller",
    amount: 1000,
    raised: 500,
    investor_count: 1,
    status,
    due_date: "2026-12-01T00:00:00Z",
    description: "",
    investors: [],
    document_url: "",
  };
}

describe("useInvoiceStatusPolling (issue #282)", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    toast.success = vi.fn() as any;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("classifies terminal statuses", () => {
    expect(isTerminalInvoiceStatus("settled")).toBe(true);
    expect(isTerminalInvoiceStatus("rejected")).toBe(true);
    expect(isTerminalInvoiceStatus("open")).toBe(false);
    expect(isTerminalInvoiceStatus("funded")).toBe(false);
  });

  it("maps status transitions to friendly messages", () => {
    expect(statusChangeMessage("funded")).toMatch(/fully funded/i);
    expect(statusChangeMessage("settled")).toMatch(/settled/i);
    expect(statusChangeMessage("rejected")).toMatch(/rejected/i);
  });

  it("polls every 30s and stops at a terminal state", async () => {
    vi.useFakeTimers();
    let current: api.Invoice["status"] = "open";
    const fetchMock = vi.fn(async () => invoiceDetail(current));
    vi.spyOn(api, "fetchInvoiceDetail").mockImplementation(fetchMock);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { result } = renderHook(
      () => useInvoiceStatusPolling({ invoiceId: "inv-1" }),
      { wrapper: createWrapper(queryClient) },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Poll again after the interval while non-terminal.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(INVOICE_STATUS_POLL_INTERVAL_MS);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Transition to settled — after this the next poll would stop.
    current = "settled";
    await act(async () => {
      await vi.advanceTimersByTimeAsync(INVOICE_STATUS_POLL_INTERVAL_MS);
    });
    const callsAfterTransition = fetchMock.mock.calls.length;

    // No further polling once terminal.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(INVOICE_STATUS_POLL_INTERVAL_MS * 3);
    });
    expect(fetchMock.mock.calls.length).toBe(callsAfterTransition);
    expect(result.current.data?.status).toBe("settled");
  });

  it("toasts on a status transition and invalidates dependent caches", async () => {
    let current: api.Invoice["status"] = "open";
    const fetchMock = vi.fn(async () => invoiceDetail(current));
    vi.spyOn(api, "fetchInvoiceDetail").mockImplementation(fetchMock);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(
      () => useInvoiceStatusPolling({ invoiceId: "inv-1" }),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.data?.status).toBe("open"));
    expect(toast.success).not.toHaveBeenCalled();

    current = "funded";
    await act(async () => {
      result.current.refetch();
      await vi.waitFor(() => expect(result.current.data?.status).toBe("funded"));
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledTimes(1);
    });
    expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/fully funded/i));
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalled();
    });

    // A second refetch with the same (already seen) transition must not
    // duplicate the notification.
    await act(async () => {
      await result.current.refetch();
    });
    await waitFor(() => expect(result.current.data?.status).toBe("funded"));
    expect(toast.success).toHaveBeenCalledTimes(1);
  });
});
