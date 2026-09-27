import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

import { AdminInvoicesReview } from "../AdminInvoicesReview";
import * as api from "@/lib/api";
import { toast } from "sonner";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ jwt: "tok" }) }));
vi.mock("@/components/invoices/DocumentPreview", () => ({
  DocumentPreview: () => <div data-testid="document-preview" />,
}));

const invoicesFixture: api.AdminInvoicesResponse = {
  invoices: [
    {
      invoiceId: "inv-1",
      sellerName: "Acme Ltd",
      faceValue: 5000,
      submittedAt: "2026-09-01T09:00:00Z",
      documentUrl: "https://ipfs.example/ipfs/QmInvoice1",
      status: "pending",
    },
    {
      invoiceId: "inv-2",
      sellerName: "Globex",
      faceValue: 1200,
      submittedAt: "2026-09-02T09:00:00Z",
      documentUrl: "https://ipfs.example/ipfs/QmInvoice2",
      status: "pending",
    },
  ],
  has_more: false,
  next_cursor: null,
};

const mockedFetchAdminInvoices = vi.mocked(api.fetchAdminInvoices);
const mockedApprove = vi.mocked(api.approveAdminInvoice);
const mockedReject = vi.mocked(api.rejectAdminInvoice);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  queryClient.setQueryData(["admin-invoices-pending", "tok"], {
    pages: [invoicesFixture],
    pageParams: [undefined],
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedFetchAdminInvoices.mockResolvedValue(invoicesFixture);
  mockedApprove.mockResolvedValue({ success: true });
  mockedReject.mockResolvedValue({ success: true });
});

describe("AdminInvoicesReview — issue #280", () => {
  it("lists pending invoices with key metadata", async () => {
    render(<AdminInvoicesReview />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByTestId("admin-invoices-table"));

    expect(screen.getByText("Acme Ltd")).toBeTruthy();
    expect(screen.getByText(/5,000 XLM/)).toBeTruthy();
  });

  it("opens the detail drawer on row click with the IPFS document link", async () => {
    render(<AdminInvoicesReview />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByTestId("invoice-row-inv-1"));

    fireEvent.click(screen.getByTestId("invoice-row-inv-1"));

    await waitFor(() => {
      expect(screen.getByTestId("invoice-drawer")).toBeInTheDocument();
    });
    const ipfsLink = screen.getByTestId("ipfs-link") as HTMLAnchorElement;
    expect(ipfsLink.href).toContain("ipfs.example/ipfs/QmInvoice1");
  });

  it("opens the document modal via the View Document button", async () => {
    render(<AdminInvoicesReview />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByTestId(`view-doc-btn-inv-2`));

    fireEvent.click(screen.getByTestId(`view-doc-btn-inv-2`));
    expect(screen.getByTestId("document-modal")).toBeInTheDocument();
  });

  it("asks for confirmation before approving", async () => {
    render(<AdminInvoicesReview />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByTestId(`approve-btn-inv-1`));

    fireEvent.click(screen.getByTestId(`approve-btn-inv-1`));
    expect(screen.getByTestId("confirm-action-modal")).toBeInTheDocument();
    // The API has not been called yet — the modal requires confirmation.
    expect(mockedApprove).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("confirm-action-btn"));

    await waitFor(() => {
      expect(mockedApprove).toHaveBeenCalledWith("inv-1", "tok");
    });
  });

  it("requires a rejection reason on reject", async () => {
    render(<AdminInvoicesReview />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByTestId(`reject-btn-inv-1`));

    fireEvent.click(screen.getByTestId(`reject-btn-inv-1`));
    expect(screen.getByTestId(`reject-reason-input-inv-1`)).toBeTruthy();

    fireEvent.change(screen.getByTestId(`reject-reason-input-inv-1`), {
      target: { value: "Fraudulent document" },
    });
    fireEvent.click(screen.getByTestId(`confirm-reject-btn-inv-1`));
    expect(screen.getByTestId("confirm-action-modal")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("confirm-action-btn"));
    await waitFor(() => {
      expect(mockedReject).toHaveBeenCalledWith(
        "inv-1",
        "Fraudulent document",
        "tok",
      );
    });
  });

  it("rolls back the optimistic removal when approval fails", async () => {
    mockedApprove.mockRejectedValue(new Error("Network failure"));

    render(<AdminInvoicesReview />, { wrapper: createWrapper() });
    await waitFor(() => screen.getByTestId(`approve-btn-inv-1`));

    fireEvent.click(screen.getByTestId(`approve-btn-inv-1`));
    fireEvent.click(screen.getByTestId("confirm-action-btn"));

    // Row disappears optimistically…
    await waitFor(() => {
      expect(screen.queryByTestId(`invoice-row-inv-1`)).toBeNull();
    });

    // …then is restored after the API error (optimistic rollback).
    await waitFor(() => {
      expect(screen.getByTestId(`invoice-row-inv-1`)).toBeTruthy();
    });
    expect(toast.error).toHaveBeenCalled();
  });
});
