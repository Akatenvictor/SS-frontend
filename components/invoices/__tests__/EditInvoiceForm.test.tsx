import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { EditInvoiceForm } from "../EditInvoiceForm";
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

function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const mockDraftInvoice: api.InvoiceDetail = {
  id: "inv-123",
  title: "Draft Invoice Title",
  seller: "GABC...1234",
  amount: 5000,
  raised: 0,
  investor_count: 0,
  status: "draft" as any,
  due_date: "2026-12-31",
  has_more: false,
  next_cursor: null,
  description: "Original description for draft invoice",
  investors: [],
  document_url: "ipfs://QmbWqx252726",
};

const mockNonDraftInvoice: api.InvoiceDetail = {
  ...mockDraftInvoice,
  status: "open",
};

beforeEach(() => {
  vi.restoreAllMocks();
  mockPush.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("EditInvoiceForm", () => {
  it("shows loading state while fetching invoice", () => {
    vi.spyOn(api, "fetchInvoiceDetail").mockReturnValue(new Promise(() => {}));
    renderWithClient(<EditInvoiceForm invoiceId="inv-123" />);
    expect(screen.getByTestId("edit-invoice-loading")).toBeInTheDocument();
  });

  it("pre-populates form fields and shows existing document CID for draft invoice", async () => {
    vi.spyOn(api, "fetchInvoiceDetail").mockResolvedValue(mockDraftInvoice);
    renderWithClient(<EditInvoiceForm invoiceId="inv-123" />);

    const titleInput = (await screen.findByLabelText(/invoice title/i)) as HTMLInputElement;
    const descInput = screen.getByLabelText(/description/i) as HTMLTextAreaElement;
    const faceValueInput = screen.getByLabelText(/face value/i) as HTMLInputElement;
    const deadlineInput = screen.getByLabelText(/funding deadline/i) as HTMLInputElement;

    expect(titleInput.value).toBe("Draft Invoice Title");
    expect(descInput.value).toBe("Original description for draft invoice");
    expect(faceValueInput.value).toBe("5000");
    expect(deadlineInput.value).toBe("2026-12-31");

    expect(screen.getByText(/ipfs:\/\/QmbWqx252726/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /replace document/i })).toBeInTheDocument();
  });

  it("blocks editing and displays error card when invoice is not draft", async () => {
    vi.spyOn(api, "fetchInvoiceDetail").mockResolvedValue(mockNonDraftInvoice);
    renderWithClient(<EditInvoiceForm invoiceId="inv-123" />);

    expect(await screen.findByTestId("cannot-edit-card")).toBeInTheDocument();
    expect(screen.getByText(/this invoice cannot be edited/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/invoice title/i)).not.toBeInTheDocument();
  });

  it("sends PATCH request on save and redirects to seller dashboard", async () => {
    vi.spyOn(api, "fetchInvoiceDetail").mockResolvedValue(mockDraftInvoice);
    const updateSpy = vi.spyOn(api, "updateInvoice").mockResolvedValue({
      ...mockDraftInvoice,
      title: "Updated Title",
    });

    renderWithClient(<EditInvoiceForm invoiceId="inv-123" />);

    const titleInput = await screen.findByLabelText(/invoice title/i);
    fireEvent.change(titleInput, { target: { value: "Updated Title" } });

    const saveBtn = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith("inv-123", expect.objectContaining({ title: "Updated Title" }));
      expect(toast.success).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/seller");
    });
  });
});
