import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { TimelockProposalsPanel } from "../TimelockProposalsPanel";
import * as api from "@/lib/api";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ address: "GADMINTEST", jwt: "jwt-token" }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
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

function pendingProposal(
  overrides: Partial<api.TimelockProposal> = {}
): api.TimelockProposal {
  return {
    id: "prop-1",
    changeType: "update_protocol_fee",
    payload: { feeBps: 250 },
    proposedAt: "2026-08-01T10:00:00.000Z",
    executionNotBefore: new Date(Date.now() + 86_400_000).toISOString(),
    status: "pending",
    executedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TimelockProposalsPanel", () => {
  it("lists pending proposals with their change type, payload and window fields", async () => {
    vi.spyOn(api, "fetchTimelockProposals").mockResolvedValue({
      proposals: [pendingProposal()],
    });

    renderWithClient(<TimelockProposalsPanel />);

    await waitFor(() => {
      expect(screen.getByTestId("timelock-proposal-prop-1")).toBeInTheDocument();
    });

    expect(screen.getByTestId("timelock-change-type-prop-1")).toHaveTextContent(
      "update_protocol_fee"
    );
    expect(screen.getByTestId("timelock-payload-prop-1")).toHaveTextContent(
      "feeBps: 250"
    );
    expect(screen.getByTestId("timelock-proposed-at-prop-1")).toHaveTextContent(
      "Proposed"
    );
    expect(screen.getByTestId("timelock-not-before-prop-1")).toHaveTextContent(
      "Executable from"
    );
  });

  it("shows a countdown and disables Execute before the window opens", async () => {
    vi.spyOn(api, "fetchTimelockProposals").mockResolvedValue({
      proposals: [pendingProposal()],
    });

    renderWithClient(<TimelockProposalsPanel />);

    await waitFor(() => {
      expect(screen.getByTestId("timelock-countdown-prop-1")).toBeInTheDocument();
    });

    expect(screen.getByTestId("timelock-countdown-prop-1")).toHaveTextContent(
      "Executable in"
    );
    expect(screen.getByTestId("timelock-execute-prop-1")).toBeDisabled();
  });

  it("enables Execute once the execution window has opened", async () => {
    vi.spyOn(api, "fetchTimelockProposals").mockResolvedValue({
      proposals: [
        pendingProposal({
          executionNotBefore: new Date(Date.now() - 60_000).toISOString(),
        }),
      ],
    });

    renderWithClient(<TimelockProposalsPanel />);

    await waitFor(() => {
      expect(screen.getByTestId("timelock-ready-prop-1")).toBeInTheDocument();
    });

    expect(screen.getByTestId("timelock-execute-prop-1")).toBeEnabled();
    expect(
      screen.queryByTestId("timelock-countdown-prop-1")
    ).not.toBeInTheDocument();
  });

  it("executes an eligible proposal", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "fetchTimelockProposals").mockResolvedValue({
      proposals: [
        pendingProposal({
          executionNotBefore: new Date(Date.now() - 60_000).toISOString(),
        }),
      ],
    });
    const executeSpy = vi
      .spyOn(api, "executeTimelockProposal")
      .mockResolvedValue({ success: true });

    renderWithClient(<TimelockProposalsPanel />);

    await waitFor(() => {
      expect(screen.getByTestId("timelock-execute-prop-1")).toBeEnabled();
    });
    await user.click(screen.getByTestId("timelock-execute-prop-1"));

    await waitFor(() => {
      expect(executeSpy).toHaveBeenCalledWith("prop-1", "jwt-token");
    });
  });

  it("removes a proposal from the list after cancel is confirmed", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi
      .spyOn(api, "fetchTimelockProposals")
      .mockResolvedValueOnce({ proposals: [pendingProposal()] })
      .mockResolvedValue({ proposals: [] });
    const cancelSpy = vi
      .spyOn(api, "cancelTimelockProposal")
      .mockResolvedValue({ success: true });

    renderWithClient(<TimelockProposalsPanel />);

    await waitFor(() => {
      expect(screen.getByTestId("timelock-cancel-prop-1")).toBeInTheDocument();
    });
    await user.click(screen.getByTestId("timelock-cancel-prop-1"));

    // Cancel requires confirmation before it fires.
    expect(cancelSpy).not.toHaveBeenCalled();
    await user.click(screen.getByTestId("timelock-cancel-confirm"));

    await waitFor(() => {
      expect(cancelSpy).toHaveBeenCalledWith("prop-1", "jwt-token");
    });

    await waitFor(() => {
      expect(
        screen.queryByTestId("timelock-proposal-prop-1")
      ).not.toBeInTheDocument();
    });
    expect(fetchSpy.mock.calls.length).toBeGreaterThan(1);
  });

  it("lists executed proposals in a separate Completed section", async () => {
    vi.spyOn(api, "fetchTimelockProposals").mockResolvedValue({
      proposals: [
        pendingProposal(),
        pendingProposal({
          id: "prop-2",
          changeType: "rotate_admin",
          status: "executed",
          executedAt: "2026-08-10T12:00:00.000Z",
        }),
      ],
    });

    renderWithClient(<TimelockProposalsPanel />);

    await waitFor(() => {
      expect(screen.getByTestId("timelock-completed-prop-2")).toBeInTheDocument();
    });

    expect(screen.getByTestId("timelock-completed-prop-2")).toHaveTextContent(
      "rotate_admin"
    );
    // The executed proposal must not appear as a pending row.
    expect(
      screen.queryByTestId("timelock-proposal-prop-2")
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("timelock-proposal-prop-1")).toBeInTheDocument();
  });
});
