import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import { CompareToggleButton } from "../CompareToggleButton";
import {
  ComparisonProvider,
  MAX_COMPARE_INVOICES,
} from "../InvoiceComparisonContext";
import type { Invoice } from "@/lib/api";

// Radix's tooltip measures its trigger with ResizeObserver, absent in jsdom.
beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
});

afterEach(() => {
  vi.clearAllMocks();
});

function makeInvoice(id: string): Invoice {
  return {
    id,
    title: `${id} receivable`,
    seller: "GABCISSUER",
    amount: 10_000,
    raised: 0,
    investor_count: 0,
    status: "open",
    due_date: "2030-01-01T00:00:00.000Z",
    has_more: false,
    next_cursor: null,
  };
}

function renderWithProvider(ui: ReactNode) {
  return render(<ComparisonProvider>{ui}</ComparisonProvider>);
}

function Cards() {
  return (
    <div>
      {["a", "b", "c", "d"].map((id) => (
        <CompareToggleButton key={id} invoice={makeInvoice(id)} />
      ))}
    </div>
  );
}

describe("CompareToggleButton", () => {
  it("adds an invoice to the comparison and reflects the pressed state", () => {
    renderWithProvider(<Cards />);

    const button = screen.getByTestId("compare-toggle-a");
    expect(button).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(button);

    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("removes an already selected invoice", () => {
    renderWithProvider(<Cards />);

    const button = screen.getByTestId("compare-toggle-a");
    fireEvent.click(button);
    fireEvent.click(button);

    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("allows the full set of three invoices", () => {
    renderWithProvider(<Cards />);

    for (const id of ["a", "b", "c"]) {
      expect(screen.getByTestId(`compare-toggle-${id}`)).not.toBeDisabled();
      fireEvent.click(screen.getByTestId(`compare-toggle-${id}`));
    }

    for (const id of ["a", "b", "c"]) {
      expect(screen.getByTestId(`compare-toggle-${id}`)).toHaveAttribute("aria-pressed", "true");
    }
  });

  it("disables further selection once three invoices are chosen", () => {
    renderWithProvider(<Cards />);

    for (const id of ["a", "b", "c"]) {
      fireEvent.click(screen.getByTestId(`compare-toggle-${id}`));
    }

    expect(MAX_COMPARE_INVOICES).toBe(3);
    expect(screen.getByTestId("compare-toggle-d")).toBeDisabled();
  });

  it("does not select a locked invoice when clicked", () => {
    renderWithProvider(<Cards />);

    for (const id of ["a", "b", "c"]) {
      fireEvent.click(screen.getByTestId(`compare-toggle-${id}`));
    }
    fireEvent.click(screen.getByTestId("compare-toggle-d"));

    expect(screen.getByTestId("compare-toggle-d")).toHaveAttribute("aria-pressed", "false");
  });

  it("exposes the limit reason in a tooltip on the locked control", async () => {
    renderWithProvider(<Cards />);

    for (const id of ["a", "b", "c"]) {
      fireEvent.click(screen.getByTestId(`compare-toggle-${id}`));
    }

    fireEvent.focus(screen.getByTestId("compare-locked-d"));

    expect(
      await screen.findByText("You can compare up to 3 invoices. Remove one first.")
    ).toBeInTheDocument();
  });

  it("keeps a selected invoice removable at the cap", () => {
    renderWithProvider(<Cards />);

    for (const id of ["a", "b", "c"]) {
      fireEvent.click(screen.getByTestId(`compare-toggle-${id}`));
    }

    const selected = screen.getByTestId("compare-toggle-a");
    expect(selected).not.toBeDisabled();

    fireEvent.click(selected);
    expect(selected).toHaveAttribute("aria-pressed", "false");
    // Having freed a slot, another invoice can be added again.
    expect(screen.getByTestId("compare-toggle-d")).not.toBeDisabled();
  });
});
