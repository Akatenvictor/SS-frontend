"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import type { Invoice } from "@/lib/api";

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

  const addToCompare = (invoice: Invoice) => {
    if (compareInvoices.length >= 2) return;
    if (compareInvoices.some((inv) => inv.id === invoice.id)) return;
    setCompareInvoices([...compareInvoices, invoice]);
  };

  const removeFromCompare = (invoiceId: string) => {
    setCompareInvoices(compareInvoices.filter((inv) => inv.id !== invoiceId));
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
