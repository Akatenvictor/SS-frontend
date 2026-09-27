import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { AdminSettlements } from "../AdminSettlements";
import * as api from "@/lib/api";
import { toast } from "sonner";

const ADMIN_A = "GADMINAAA123456789012345678901234567890123456789012";
const ADMIN_B = "GADMINBBB123456789012345678901234567890123456789012";

let currentAddress = ADMIN_A;
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ address: currentAddress, jwt: "test-jwt" }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const rowWithoutProposal: api.SettlementInvoiceRow = {
  invoice_id: "inv-1",
  title: "Acme Corp Invoice",
  face_value: 10000,
  seller: "GSELLER123456789012345678901234567890123456789012",
  proposal: null,
};

const rowWithProposalByAdminA: api.SettlementInvoiceRow = {
  invoice_id: "inv-2",
  title: "Beta LLC Invoice",
  face_value: 5000,
  seller: "GSELLER223456789012345678901234567890123456789012",
  proposal: {
    id: "prop-1",
    amount: 5200,
    proposed_by: ADMIN_A,
    proposed_at: "2026-08-20T00:00:00.000Z",
  },
};

beforeEach(() => {
  vi.restoreAllMocks();
  currentAddress = ADMIN_A;
});

describe("AdminSettlements (issue #118)", () => {
  it("shows the empty state when no funded invoices are awaiting settlement", async () => {
    vi.spyOn(api, "fetchSettlements").mockResolvedValue({
      invoices: [],
      has_more: false,
      next_cursor: null,
    });

    renderWithClient(<AdminSettlements isAdmin />);

    await waitFor(() => {
      expect(screen.getByTestId("empty-settlements")).toBeInTheDocument();
    });
  });

  it("opens an amount input and submits a settlement proposal", async () => {
    vi.spyOn(api, "fetchSettlements").mockResolvedValue({
      invoices: [rowWithoutProposal],
      has_more: false,
      next_cursor: null,
    });
    const proposeSpy = vi
      .spyOn(api, "proposeSettlement")
      .mockResolvedValue({ success: true });

    renderWithClient(<AdminSettlements isAdmin />);

    await waitFor(() => {
      expect(screen.getByTestId("propose-settlement-inv-1")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("propose-settlement-inv-1"));

    fireEvent.change(screen.getByLabelText("Repayment amount"), {
      target: { value: "10500" },
    });
    fireEvent.click(screen.getByText("Submit Proposal"));

    await waitFor(() => {
      expect(proposeSpy).toHaveBeenCalledWith("inv-1", 10500, "test-jwt");
    });
    expect(toast.success).toHaveBeenCalledWith("Settlement proposed");
  });

  it("shows a pending badge on invoices with an open proposal", async () => {
    vi.spyOn(api, "fetchSettlements").mockResolvedValue({
      invoices: [rowWithProposalByAdminA],
      has_more: false,
      next_cursor: null,
    });

    renderWithClient(<AdminSettlements isAdmin />);

    await waitFor(() => {
      expect(
        screen.getByTestId("pending-settlement-badge-inv-2")
      ).toBeInTheDocument();
    });
  });

  it("disables the approve button for the admin who proposed the settlement", async () => {
    currentAddress = ADMIN_A; // same admin who proposed rowWithProposalByAdminA
    vi.spyOn(api, "fetchSettlements").mockResolvedValue({
      invoices: [rowWithProposalByAdminA],
      has_more: false,
      next_cursor: null,
    });

    renderWithClient(<AdminSettlements isAdmin />);

    await waitFor(() => {
      expect(screen.getByTestId("approve-settlement-inv-2")).toBeDisabled();
    });
  });

  it("allows a different admin to approve and execute the settlement", async () => {
    currentAddress = ADMIN_B; // different admin from the one who proposed
    vi.spyOn(api, "fetchSettlements").mockResolvedValue({
      invoices: [rowWithProposalByAdminA],
      has_more: false,
      next_cursor: null,
    });
    const approveSpy = vi
      .spyOn(api, "approveSettlement")
      .mockResolvedValue({ success: true });

    renderWithClient(<AdminSettlements isAdmin />);

    await waitFor(() => {
      expect(screen.getByTestId("approve-settlement-inv-2")).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId("approve-settlement-inv-2"));

    await waitFor(() => {
      expect(approveSpy).toHaveBeenCalledWith("inv-2", "test-jwt");
    });
    await waitFor(() => {
      expect(screen.getByTestId("settlement-executed-banner")).toHaveTextContent(
        "Settlement executed"
      );
    });
  });

  it("shows an error if the same admin's approval attempt reaches the backend anyway", async () => {
    currentAddress = ADMIN_B;
    vi.spyOn(api, "fetchSettlements").mockResolvedValue({
      invoices: [rowWithProposalByAdminA],
      has_more: false,
      next_cursor: null,
    });
    vi.spyOn(api, "approveSettlement").mockRejectedValue(
      new Error("Cannot approve your own settlement proposal")
    );

    renderWithClient(<AdminSettlements isAdmin />);

    await waitFor(() => {
      expect(screen.getByTestId("approve-settlement-inv-2")).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId("approve-settlement-inv-2"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Cannot approve your own settlement proposal"
      );
    });
  });
});
