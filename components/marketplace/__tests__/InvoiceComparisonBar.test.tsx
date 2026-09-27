import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { ReactNode } from "react";
import { InvoiceComparisonBar } from "../InvoiceComparisonBar";
import { ComparisonProvider, useComparison } from "../InvoiceComparisonContext";
import type { Invoice } from "@/lib/api";

const mockInvoices: Invoice[] = [
  {
    id: "1",
    title: "Invoice 1",
    seller: "Seller 1",
    amount: 1000,
    raised: 500,
    investor_count: 2,
    status: "open",
    due_date: "2024-12-31",
    has_more: false,
    next_cursor: null,
  },
  {
    id: "2",
    title: "Invoice 2",
    seller: "Seller 2",
    amount: 2000,
    raised: 1000,
    investor_count: 3,
    status: "open",
    due_date: "2024-11-30",
    has_more: false,
    next_cursor: null,
  },
];

function TestWrapper({ children, initialInvoices = [] }: { children: ReactNode; initialInvoices?: Invoice[] }) {
  return (
    <ComparisonProvider>
      <TestInitializer initialInvoices={initialInvoices}>
        {children}
      </TestInitializer>
    </ComparisonProvider>
  );
}

function TestInitializer({ children, initialInvoices }: { children: ReactNode; initialInvoices: Invoice[] }) {
  const { addToCompare } = useComparison();

  React.useEffect(() => {
    initialInvoices.forEach(invoice => addToCompare(invoice));
  }, [initialInvoices, addToCompare]);

  return <>{children}</>;
}

describe("InvoiceComparisonBar", () => {
  it("should not render when no invoices are selected", () => {
    render(
      <TestWrapper>
        <InvoiceComparisonBar />
      </TestWrapper>
    );

    expect(screen.queryByText(/invoice.*selected/)).not.toBeInTheDocument();
  });

  it("should render when invoices are selected", () => {
    render(
      <TestWrapper initialInvoices={[mockInvoices[0]]}>
        <InvoiceComparisonBar />
      </TestWrapper>
    );

    expect(screen.getByText(/1 invoice selected/)).toBeInTheDocument();
    expect(screen.getByText("Invoice 1")).toBeInTheDocument();
  });

  it("should display correct count for multiple invoices", () => {
    render(
      <TestWrapper initialInvoices={mockInvoices}>
        <InvoiceComparisonBar />
      </TestWrapper>
    );

    expect(screen.getByText(/2 invoices selected/)).toBeInTheDocument();
  });

  it("should remove invoice when close button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper initialInvoices={[mockInvoices[0]]}>
        <InvoiceComparisonBar />
      </TestWrapper>
    );

    const closeButton = screen.getAllByRole("button")[0];
    await user.click(closeButton);

    expect(screen.queryByText(/invoice.*selected/)).not.toBeInTheDocument();
  });
});
