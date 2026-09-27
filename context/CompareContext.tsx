"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  addToComparison,
  MAX_COMPARE_ITEMS,
  removeFromComparison,
  type ComparableInvoice,
} from "@/lib/compare";

export interface CompareContextValue {
  items: ComparableInvoice[];
  maxItems: number;
  /** True once the cap is reached and the item is not already selected. */
  isFull: boolean;
  isSelected: (id: string) => boolean;
  add: (invoice: ComparableInvoice) => void;
  remove: (id: string) => void;
  toggle: (invoice: ComparableInvoice) => void;
  clear: () => void;
}

const CompareContext = createContext<CompareContextValue | undefined>(undefined);

export interface CompareProviderProps {
  children: React.ReactNode;
  /** Overridable for tests. */
  maxItems?: number;
}

export function CompareProvider({ children, maxItems = MAX_COMPARE_ITEMS }: CompareProviderProps) {
  const [items, setItems] = useState<ComparableInvoice[]>([]);

  const add = useCallback(
    (invoice: ComparableInvoice) => {
      setItems((current) => addToComparison(current, invoice, maxItems));
    },
    [maxItems]
  );

  const remove = useCallback((id: string) => {
    setItems((current) => removeFromComparison(current, id));
  }, []);

  const toggle = useCallback(
    (invoice: ComparableInvoice) => {
      setItems((current) =>
        current.some((item) => item.id === invoice.id)
          ? removeFromComparison(current, invoice.id)
          : addToComparison(current, invoice, maxItems)
      );
    },
    [maxItems]
  );

  const clear = useCallback(() => setItems([]), []);

  const isSelected = useCallback(
    (id: string) => items.some((item) => item.id === id),
    [items]
  );

  const value = useMemo<CompareContextValue>(
    () => ({
      items,
      maxItems,
      isFull: items.length >= maxItems,
      isSelected,
      add,
      remove,
      toggle,
      clear,
    }),
    [items, maxItems, isSelected, add, remove, toggle, clear]
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

/**
 * Access the comparison tray. Throws outside a {@link CompareProvider} so a
 * missing provider surfaces immediately rather than silently no-op'ing.
 */
export function useCompareContext(): CompareContextValue {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error("useCompareContext must be used within a CompareProvider");
  }
  return context;
}
