import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SellerInvoiceTabs } from "../SellerInvoiceTabs";
import type { Invoice } from "@/lib/api";

const submitMutate = vi.fn();
const deleteMutate = vi.fn();
const deleteReset = vi.fn();

let deleteState = { isPending: false, isError: false };

vi.mock("@/hooks/useSellerInvoiceActions", () => ({
  useSubmitDraftInvoice: () => ({
    mutate: submitMutate,
    isPending: false,
    variables: undefined,
  }),
  useDeleteDraftInvoice: () => ({
    mutate: deleteMutate,
    reset: deleteReset,
    isPending: deleteState.isPending,
    isError: deleteState.isError,
  }),
}));

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: "inv-1",
    title: "Acme Invoice",
    seller: "GSELLER",
    amount: 1000,
    raised: 0,
    investor_count: 0,
    status: "draft",
    due_date: "2026-12-01",
    has_more: false,
    next_cursor: null,
    ...overrides,
  };
}

const fixtures: Invoice[] = [
  makeInvoice({ id: "d1", title: "Draft One", status: "draft" }),
  makeInvoice({
    id: "r1",
    title: "Rejected One",
    status: "rejected",
    rejection_reason: "Missing documents",
  }),
  makeInvoice({ id: "p1", title: "Pending One", status: "pending" }),
  makeInvoice({
    id: "l1",
    title: "Live One",
    status: "open",
    raised: 400,
    investor_count: 3,
  }),
  makeInvoice({
    id: "f1",
    title: "Funded One",
    status: "funded",
    raised: 1000,
    investor_count: 8,
    yield_percentage: 10,
  }),
  makeInvoice({
    id: "s1",
    title: "Settled One",
    status: "settled",
    raised: 1000,
    investor_count: 8,
    yield_percentage: 10,
  }),
];

beforeEach(() => {
  vi.clearAllMocks();
  deleteState = { isPending: false, isError: false };
});

describe("tab rendering", () => {
  it("opens on the draft tab and shows only draft and rejected invoices", () => {
    render(<SellerInvoiceTabs invoices={fixtures} />);

    expect(screen.getByRole("tab", { name: /Draft/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Draft One")).toBeInTheDocument();
    expect(screen.getByText("Rejected One")).toBeInTheDocument();
    expect(screen.queryByText("Live One")).not.toBeInTheDocument();
  });

  it("labels each tab with its count", () => {
    render(<SellerInvoiceTabs invoices={fixtures} />);

    expect(screen.getByRole("tab", { name: /Draft \(2\)/ })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /Pending Review \(1\)/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Settled \(1\)/ })).toBeInTheDocument();
  });

  it("switches the visible invoices when a tab is selected", async () => {
    const user = userEvent.setup();
    render(<SellerInvoiceTabs invoices={fixtures} />);

    await user.click(screen.getByRole("tab", { name: /Live/ }));

    expect(screen.getByText("Live One")).toBeInTheDocument();
    expect(screen.queryByText("Draft One")).not.toBeInTheDocument();
  });

  it("shows a per-tab empty state", async () => {
    const user = userEvent.setup();
    render(<SellerInvoiceTabs invoices={[makeInvoice({ status: "draft" })]} />);

    await user.click(screen.getByRole("tab", { name: /Settled/ }));

    expect(screen.getByTestId("seller-invoices-empty")).toBeInTheDocument();
    expect(screen.getByText(/No invoices have settled yet/)).toBeInTheDocument();
  });

  it("shows the rejection reason on a rejected invoice", () => {
    render(<SellerInvoiceTabs invoices={fixtures} />);

    expect(screen.getByTestId("rejected-banner")).toHaveTextContent(
      "Missing documents",
    );
  });
});

describe("per-state actions", () => {
  it("offers edit, submit and delete on a draft", () => {
    render(<SellerInvoiceTabs invoices={[fixtures[0]]} />);

    expect(screen.getByRole("link", { name: "Edit" })).toHaveAttribute(
      "href",
      "/seller/invoices/d1/edit",
    );
    expect(screen.getByTestId("submit-invoice-d1")).toBeInTheDocument();
    expect(screen.getByTestId("delete-invoice-d1")).toBeInTheDocument();
  });

  it("offers edit and resubmit but no delete on a rejected invoice", () => {
    render(<SellerInvoiceTabs invoices={[fixtures[1]]} />);

    expect(
      screen.getByRole("link", { name: "Edit and resubmit" }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("delete-invoice-r1")).not.toBeInTheDocument();
  });

  it("offers no draft actions once an invoice is under review", async () => {
    const user = userEvent.setup();
    render(<SellerInvoiceTabs invoices={fixtures} />);

    await user.click(screen.getByRole("tab", { name: /Pending Review/ }));

    expect(screen.queryByTestId("submit-invoice-p1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("delete-invoice-p1")).not.toBeInTheDocument();
  });

  it("submits a draft for review", async () => {
    const user = userEvent.setup();
    render(<SellerInvoiceTabs invoices={[fixtures[0]]} />);

    await user.click(screen.getByTestId("submit-invoice-d1"));

    expect(submitMutate).toHaveBeenCalledWith("d1");
  });

  it("shows funding progress on the live tab and a payout summary on funded", async () => {
    const user = userEvent.setup();
    render(<SellerInvoiceTabs invoices={fixtures} />);

    await user.click(screen.getByRole("tab", { name: /Live/ }));
    expect(screen.queryByTestId("payout-summary")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Funded/ }));
    const summary = screen.getByTestId("payout-summary");
    expect(summary).toHaveTextContent("8");
    expect(summary).toHaveTextContent("Expected yield");
  });

  it("labels settled yield as paid rather than expected", async () => {
    const user = userEvent.setup();
    render(<SellerInvoiceTabs invoices={fixtures} />);

    await user.click(screen.getByRole("tab", { name: /Settled/ }));

    expect(screen.getByTestId("payout-summary")).toHaveTextContent("Yield paid");
  });
});

describe("delete confirmation", () => {
  it("does not delete until the dialog is confirmed", async () => {
    const user = userEvent.setup();
    render(<SellerInvoiceTabs invoices={[fixtures[0]]} />);

    await user.click(screen.getByTestId("delete-invoice-d1"));

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(deleteMutate).not.toHaveBeenCalled();

    await user.click(screen.getByTestId("confirm-delete-draft"));
    expect(deleteMutate).toHaveBeenCalledWith("d1", expect.anything());
  });

  it("names the invoice being deleted", async () => {
    const user = userEvent.setup();
    render(<SellerInvoiceTabs invoices={[fixtures[0]]} />);

    await user.click(screen.getByTestId("delete-invoice-d1"));

    expect(screen.getByRole("alertdialog")).toHaveTextContent("Draft One");
  });

  it("cancelling closes the dialog without deleting", async () => {
    const user = userEvent.setup();
    render(<SellerInvoiceTabs invoices={[fixtures[0]]} />);

    await user.click(screen.getByTestId("delete-invoice-d1"));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
    expect(deleteMutate).not.toHaveBeenCalled();
  });

  it("surfaces a delete failure in the dialog", async () => {
    const user = userEvent.setup();
    deleteState = { isPending: false, isError: true };
    render(<SellerInvoiceTabs invoices={[fixtures[0]]} />);

    await user.click(screen.getByTestId("delete-invoice-d1"));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not delete the draft",
    );
  });
});
