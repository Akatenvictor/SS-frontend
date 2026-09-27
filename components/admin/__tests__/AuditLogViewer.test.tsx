import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { AuditLogViewer } from "../AuditLogViewer";
import * as api from "@/lib/api";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    address: "GADMINTEST",
    jwt: "admin-jwt",
  }),
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

const entries: api.AuditLogEntry[] = [
  {
    id: "log-1",
    actorWallet: "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJ",
    actionType: "invoice_approve",
    targetId: "inv-1",
    createdAt: new Date().toISOString(),
    payload: { invoiceId: "inv-1", note: "approved" },
  },
];

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AuditLogViewer", () => {
  it("lists audit log entries with the correct fields", async () => {
    vi.spyOn(api, "fetchAuditLog").mockResolvedValue({
      entries,
      has_more: false,
      next_cursor: null,
    });

    renderWithClient(<AuditLogViewer />);

    await waitFor(() => {
      expect(screen.getByTestId("audit-log-row-log-1")).toBeInTheDocument();
    });

    expect(screen.getByText("invoice_approve")).toBeInTheDocument();
    expect(screen.getByText("inv-1")).toBeInTheDocument();
  });

  it("opens a detail drawer with the full payload on row click", async () => {
    vi.spyOn(api, "fetchAuditLog").mockResolvedValue({
      entries,
      has_more: false,
      next_cursor: null,
    });

    const user = userEvent.setup();
    renderWithClient(<AuditLogViewer />);

    const row = await screen.findByTestId("audit-log-row-log-1");
    await user.click(row);

    expect(screen.getByTestId("audit-log-detail-drawer")).toBeInTheDocument();
    expect(screen.getByText(/"invoiceId": "inv-1"/)).toBeInTheDocument();
  });

  it("shows an empty state when there are no entries", async () => {
    vi.spyOn(api, "fetchAuditLog").mockResolvedValue({
      entries: [],
      has_more: false,
      next_cursor: null,
    });

    renderWithClient(<AuditLogViewer />);

    await waitFor(() => {
      expect(screen.getByTestId("audit-log-empty")).toBeInTheDocument();
    });
  });
});
