import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import AdminInvoicesPage from "../page";
import * as api from "@/lib/api";
import * as AuthContextModule from "@/context/AuthContext";

vi.mock("@/lib/api");
vi.mock("@/context/AuthContext");
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/admin/invoices",
  useSearchParams: () => new URLSearchParams(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

// Helper to create a fake JWT with a specific role
function makeToken(role: string) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({ sub: "user-1", role }));
  const signature = "signature";
  return `${header}.${payload}.${signature}`;
}

const mockPendingInvoices = [
  {
    invoiceId: "inv-101",
    sellerName: "Acme Supplies",
    faceValue: 5000,
    submittedAt: "2026-08-20T10:00:00.000Z",
    documentUrl: "/docs/inv-101.pdf",
    status: "pending",
  },
  {
    invoiceId: "inv-102",
    sellerName: "Stellar Logistics",
    faceValue: 12000,
    submittedAt: "2026-08-21T14:30:00.000Z",
    documentUrl: "/docs/inv-102.pdf",
    status: "pending",
  },
];

describe("Admin Invoices Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("denies access when user JWT has no admin role", () => {
    const userToken = makeToken("user");
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      jwt: userToken,
      address: "GABC123",
      isConnecting: false,
      loginWithWallet: vi.fn(),
      logout: vi.fn(),
    });

    render(<AdminInvoicesPage />, { wrapper: createWrapper() });
    expect(screen.getByTestId("unauthorized-card")).toBeInTheDocument();
    expect(screen.getByText("Access Denied")).toBeInTheDocument();
  });

  it("allows access and displays pending invoices with all required fields when user is admin", async () => {
    const adminToken = makeToken("admin");
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      jwt: adminToken,
      address: "GADMIN123",
      isConnecting: false,
      loginWithWallet: vi.fn(),
      logout: vi.fn(),
    });

    vi.mocked(api.fetchAdminInvoices).mockResolvedValue({
      invoices: mockPendingInvoices,
      has_more: false,
      next_cursor: null,
    });

    render(<AdminInvoicesPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId("admin-invoices-table")).toBeInTheDocument();
    });

    expect(screen.getByText("Acme Supplies")).toBeInTheDocument();
    expect(screen.getByText("inv-101")).toBeInTheDocument();
    expect(screen.getByText("5,000 XLM")).toBeInTheDocument();

    expect(screen.getByText("Stellar Logistics")).toBeInTheDocument();
    expect(screen.getByText("inv-102")).toBeInTheDocument();
    expect(screen.getByText("12,000 XLM")).toBeInTheDocument();
  });

  it("'View Document' opens document modal", async () => {
    const adminToken = makeToken("admin");
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      jwt: adminToken,
      address: "GADMIN123",
      isConnecting: false,
      loginWithWallet: vi.fn(),
      logout: vi.fn(),
    });

    vi.mocked(api.fetchAdminInvoices).mockResolvedValue({
      invoices: [mockPendingInvoices[0]],
      has_more: false,
      next_cursor: null,
    });

    render(<AdminInvoicesPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId("view-doc-btn-inv-101")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("view-doc-btn-inv-101"));

    expect(screen.getByTestId("document-modal")).toBeInTheDocument();
  });

  it("Approve action updates invoice status and removes row", async () => {
    const adminToken = makeToken("admin");
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      jwt: adminToken,
      address: "GADMIN123",
      isConnecting: false,
      loginWithWallet: vi.fn(),
      logout: vi.fn(),
    });

    vi.mocked(api.fetchAdminInvoices).mockResolvedValue({
      invoices: [mockPendingInvoices[0]],
      has_more: false,
      next_cursor: null,
    });
    vi.mocked(api.approveAdminInvoice).mockResolvedValue({ success: true });

    render(<AdminInvoicesPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId("approve-btn-inv-101")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("approve-btn-inv-101"));

    await waitFor(() => {
      expect(api.approveAdminInvoice).toHaveBeenCalledWith("inv-101", adminToken);
      expect(screen.queryByTestId("invoice-row-inv-101")).not.toBeInTheDocument();
    });
  });

  it("Reject action requires a reason and updates status with reason", async () => {
    const adminToken = makeToken("admin");
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      jwt: adminToken,
      address: "GADMIN123",
      isConnecting: false,
      loginWithWallet: vi.fn(),
      logout: vi.fn(),
    });

    vi.mocked(api.fetchAdminInvoices).mockResolvedValue({
      invoices: [mockPendingInvoices[0]],
      has_more: false,
      next_cursor: null,
    });
    vi.mocked(api.rejectAdminInvoice).mockResolvedValue({ success: true });

    render(<AdminInvoicesPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId("reject-btn-inv-101")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("reject-btn-inv-101"));

    const confirmBtn = screen.getByTestId("confirm-reject-btn-inv-101");
    expect(confirmBtn).toBeDisabled();

    const reasonInput = screen.getByTestId("reject-reason-input-inv-101");
    fireEvent.change(reasonInput, { target: { value: "Invalid documentation" } });

    expect(confirmBtn).not.toBeDisabled();
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.rejectAdminInvoice).toHaveBeenCalledWith("inv-101", "Invalid documentation", adminToken);
      expect(screen.queryByTestId("invoice-row-inv-101")).not.toBeInTheDocument();
    });
  });
});
