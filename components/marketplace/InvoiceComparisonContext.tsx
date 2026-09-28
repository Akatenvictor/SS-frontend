"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import type { Invoice } from "@/lib/api";

/** Maximum number of invoices that can be compared at once. */
export const MAX_COMPARE_INVOICES = 3;

interface ComparisonContextType {
  compareInvoices: Invoice[];
  addToCompare: (invoice: Invoice) => void;
  removeFromCompare: (invoiceId: string) => void;
  clearComparison: () => void;
  isInCompare: (invoiceId: string) => boolean;
}

const ComparisonContext = createContext<ComparisonContextType | undefined>(
  undefined
);

export function ComparisonProvider({ children }: { children: ReactNode }) {
  const [compareInvoices, setCompareInvoices] = useState<Invoice[]>([]);

  // Functional updates throughout: reading `compareInvoices` from the closure
  // means two adds in the same tick both start from the same base and the
  // second silently overwrites the first.
  const addToCompare = (invoice: Invoice) => {
    setCompareInvoices((current) => {
      if (current.length >= MAX_COMPARE_INVOICES) return current;
      if (current.some((inv) => inv.id === invoice.id)) return current;
      return [...current, invoice];
    });
  };

  const removeFromCompare = (invoiceId: string) => {
    setCompareInvoices((current) => current.filter((inv) => inv.id !== invoiceId));
  };

  const clearComparison = () => {
    setCompareInvoices([]);
  };

  const isInCompare = (invoiceId: string) => {
    return compareInvoices.some((inv) => inv.id === invoiceId);
  };

  return (
    <ComparisonContext.Provider
      value={{
        compareInvoices,
        addToCompare,
        removeFromCompare,
        clearComparison,
        isInCompare,
      }}
    >
      {children}
    </ComparisonContext.Provider>
  );
}

export function useComparison() {
  const context = useContext(ComparisonContext);
  if (context === undefined) {
    throw new Error("useComparison must be used within a ComparisonProvider");
  }
  return context;
}
