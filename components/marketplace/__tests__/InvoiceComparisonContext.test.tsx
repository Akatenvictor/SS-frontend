import { renderHook, act } from "@testing-library/react";
import { ReactNode } from "react";
import { ComparisonProvider, useComparison } from "../InvoiceComparisonContext";
import type { Invoice } from "@/lib/api";

const wrapper = ({ children }: { children: ReactNode }) => (
  <ComparisonProvider>{children}</ComparisonProvider>
);

describe("InvoiceComparisonContext", () => {
  const mockInvoice: Invoice = {
    id: "1",
    title: "Test Invoice",
    seller: "Test Seller",
    amount: 1000,
    raised: 500,
    investor_count: 2,
    status: "open",
    due_date: "2024-12-31",
    has_more: false,
    next_cursor: null,
  };

  it("should initialize with empty comparison list", () => {
    const { result } = renderHook(() => useComparison(), { wrapper });

    expect(result.current.compareInvoices).toEqual([]);
  });

  it("should add invoice to comparison", () => {
    const { result } = renderHook(() => useComparison(), { wrapper });

    act(() => {
      result.current.addToCompare(mockInvoice);
    });

    expect(result.current.compareInvoices).toHaveLength(1);
    expect(result.current.compareInvoices[0]).toEqual(mockInvoice);
  });

  it("should not add duplicate invoices", () => {
    const { result } = renderHook(() => useComparison(), { wrapper });

    act(() => {
      result.current.addToCompare(mockInvoice);
    });

    act(() => {
      result.current.addToCompare(mockInvoice);
    });

    expect(result.current.compareInvoices).toHaveLength(1);
  });

  it("should limit comparison to 2 invoices", () => {
    const { result } = renderHook(() => useComparison(), { wrapper });

    const invoice2: Invoice = { ...mockInvoice, id: "2", title: "Invoice 2" };
    const invoice3: Invoice = { ...mockInvoice, id: "3", title: "Invoice 3" };

    act(() => {
      result.current.addToCompare(mockInvoice);
      result.current.addToCompare(invoice2);
    });

    expect(result.current.compareInvoices).toHaveLength(2);

    act(() => {
      result.current.addToCompare(invoice3);
    });

    expect(result.current.compareInvoices).toHaveLength(2);
  });

  it("should remove invoice from comparison", () => {
    const { result } = renderHook(() => useComparison(), { wrapper });

    act(() => {
      result.current.addToCompare(mockInvoice);
    });

    act(() => {
      result.current.removeFromCompare(mockInvoice.id);
    });

    expect(result.current.compareInvoices).toHaveLength(0);
  });

  it("should clear all invoices from comparison", () => {
    const { result } = renderHook(() => useComparison(), { wrapper });

    const invoice2: Invoice = { ...mockInvoice, id: "2", title: "Invoice 2" };

    act(() => {
      result.current.addToCompare(mockInvoice);
      result.current.addToCompare(invoice2);
    });

    act(() => {
      result.current.clearComparison();
    });

    expect(result.current.compareInvoices).toHaveLength(0);
  });

  it("should check if invoice is in comparison", () => {
    const { result } = renderHook(() => useComparison(), { wrapper });

    expect(result.current.isInCompare(mockInvoice.id)).toBe(false);

    act(() => {
      result.current.addToCompare(mockInvoice);
    });

    expect(result.current.isInCompare(mockInvoice.id)).toBe(true);
  });
});
