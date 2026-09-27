import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { AdminInvoiceReview } from "../AdminInvoiceReview";
import * as api from "@/lib/api";
import { toast } from "sonner";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    address: "GADMIN123456789012345678901234567890123456789012",
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

const mockPendingInvoices: api.PendingInvoice[] = [
  {
    id: "inv-1",
    title: "Supplier Invoice 1",
    seller: "GSELLER123456789012345678901234567890123456789012",
    face_value: 10000,
    submission_date: "2026-08-20",
    status: "pending_review",
  },
  {
    id: "inv-2",
    title: "Supplier Invoice 2",
    seller: "GSELLER223456789012345678901234567890123456789012",
    face_value: 25000,
    submission_date: "2026-08-22",
    status: "pending_review",
  },
];

beforeEach(() => {
  vi.restoreAllMocks();
  mockPush.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AdminInvoiceReview", () => {
  it("redirects non-admin wallets to home page with 'Not authorised' toast", async () => {
    renderWithClient(<AdminInvoiceReview isAdmin={false} />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Not authorised");
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });

  it("lists all pending review invoices with correct fields", async () => {
    vi.spyOn(api, "fetchPendingInvoices").mockResolvedValue(mockPendingInvoices);
    renderWithClient(<AdminInvoiceReview isAdmin={true} />);

    expect(await screen.findByText("Supplier Invoice 1")).toBeInTheDocument();
    expect(screen.getByText("Supplier Invoice 2")).toBeInTheDocument();

    expect(screen.getAllByText("GSEL...9012")[0]).toBeInTheDocument();
    expect(screen.getByText("10,000.00 XLM")).toBeInTheDocument();
    expect(screen.getByText("2026-08-20")).toBeInTheDocument();

  });

  it("shows empty state when no invoices are pending review", async () => {
    vi.spyOn(api, "fetchPendingInvoices").mockResolvedValue([]);
    renderWithClient(<AdminInvoiceReview isAdmin={true} />);

    expect(await screen.findByTestId("empty-pending-invoices")).toBeInTheDocument();
    expect(screen.getByText("No invoices pending review")).toBeInTheDocument();
  });

  it("approves invoice and removes it from the list", async () => {
    vi.spyOn(api, "fetchPendingInvoices").mockResolvedValue(mockPendingInvoices);
    const approveSpy = vi.spyOn(api, "approveInvoice").mockResolvedValue({ success: true });

    renderWithClient(<AdminInvoiceReview isAdmin={true} />);

    const approveButtons = await screen.findAllByRole("button", { name: /approve/i });
    fireEvent.click(approveButtons[0]);

    await waitFor(() => {
      expect(approveSpy).toHaveBeenCalledWith("inv-1");
      expect(toast.success).toHaveBeenCalledWith("Invoice approved");
      expect(screen.queryByText("Supplier Invoice 1")).not.toBeInTheDocument();
    });
  });

  it("rejects invoice with required reason and removes it from the list", async () => {
    vi.spyOn(api, "fetchPendingInvoices").mockResolvedValue(mockPendingInvoices);
    const rejectSpy = vi.spyOn(api, "rejectInvoice").mockResolvedValue({ success: true });

    renderWithClient(<AdminInvoiceReview isAdmin={true} />);

    const rejectButtons = await screen.findAllByRole("button", { name: /^reject$/i });
    fireEvent.click(rejectButtons[0]);

    const reasonInput = screen.getByPlaceholderText(/reason for rejection/i);
    const confirmBtn = screen.getByRole("button", { name: /confirm reject/i });

    // Confirm button disabled when reason is empty
    expect(confirmBtn).toBeDisabled();

    fireEvent.change(reasonInput, { target: { value: "Incomplete documentation" } });
    expect(confirmBtn).not.toBeDisabled();

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(rejectSpy).toHaveBeenCalledWith("inv-1", "Incomplete documentation");
      expect(toast.success).toHaveBeenCalledWith("Invoice rejected");
      expect(screen.queryByText("Supplier Invoice 1")).not.toBeInTheDocument();
    });
  });
});
