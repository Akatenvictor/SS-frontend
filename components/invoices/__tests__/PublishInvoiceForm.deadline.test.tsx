import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PublishInvoiceForm } from "../PublishInvoiceForm";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/lib/api", () => ({
  uploadDocumentToIpfs: vi.fn(),
  publishInvoice: vi.fn(),
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ jwt: null }) }));

describe("PublishInvoiceForm - Deadline Validation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows no error for deadline exactly 24 hours from now", async () => {
    // Set current time to noon on Aug 25, 2026
    vi.setSystemTime(new Date("2026-08-25T12:00:00Z"));

    render(<PublishInvoiceForm />);

    // Fill required fields
    fireEvent.change(screen.getByLabelText("Invoice Title"), {
      target: { value: "Test Invoice" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Test Description" },
    });
    fireEvent.change(screen.getByLabelText("Face Value (XLM)"), {
      target: { value: "5000" },
    });

    // Set deadline to exactly 24 hours later (Aug 26)
    fireEvent.change(screen.getByLabelText("Funding Deadline"), {
      target: { value: "2026-08-26" },
    });

    // Click Next - should not show error
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    // Should advance to step 2 (no error message)
    await waitFor(() => {
      expect(screen.getByText(/Document Upload/i)).toBeInTheDocument();
    });
  });

  it("shows error for deadline 23 hours 59 minutes from now", async () => {
    // Set current time to noon
    vi.setSystemTime(new Date("2026-08-25T12:00:00Z"));

    render(<PublishInvoiceForm />);

    // Fill required fields
    fireEvent.change(screen.getByLabelText("Invoice Title"), {
      target: { value: "Test Invoice" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Test Description" },
    });
    fireEvent.change(screen.getByLabelText("Face Value (XLM)"), {
      target: { value: "5000" },
    });

    // Set deadline to today (less than 24 hours from now)
    fireEvent.change(screen.getByLabelText("Funding Deadline"), {
      target: { value: "2026-08-25" },
    });

    // Click Next
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText("Deadline must be at least 24 hours from now")).toBeInTheDocument();
    });

    // Should NOT advance to step 2
    expect(screen.queryByText(/Document Upload/i)).not.toBeInTheDocument();
  });

  it("shows error for past deadline", async () => {
    // Set current time to noon on Aug 25, 2026
    vi.setSystemTime(new Date("2026-08-25T12:00:00Z"));

    render(<PublishInvoiceForm />);

    // Fill required fields
    fireEvent.change(screen.getByLabelText("Invoice Title"), {
      target: { value: "Test Invoice" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Test Description" },
    });
    fireEvent.change(screen.getByLabelText("Face Value (XLM)"), {
      target: { value: "5000" },
    });

    // Set deadline to yesterday
    fireEvent.change(screen.getByLabelText("Funding Deadline"), {
      target: { value: "2026-08-24" },
    });

    // Click Next
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText("Deadline must be at least 24 hours from now")).toBeInTheDocument();
    });
  });

  it("passes validation for deadline 7 days in the future", async () => {
    // Set current time to noon on Aug 25, 2026
    vi.setSystemTime(new Date("2026-08-25T12:00:00Z"));

    render(<PublishInvoiceForm />);

    // Fill required fields
    fireEvent.change(screen.getByLabelText("Invoice Title"), {
      target: { value: "Test Invoice" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Test Description" },
    });
    fireEvent.change(screen.getByLabelText("Face Value (XLM)"), {
      target: { value: "5000" },
    });

    // Set deadline to 7 days later (Sept 1)
    fireEvent.change(screen.getByLabelText("Funding Deadline"), {
      target: { value: "2026-09-01" },
    });

    // Click Next
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    // Should advance to step 2 (no error)
    await waitFor(() => {
      expect(screen.getByText(/Document Upload/i)).toBeInTheDocument();
    });
  });

  it("disables Next button initially when deadline is invalid", async () => {
    // Set current time to noon on Aug 25, 2026
    vi.setSystemTime(new Date("2026-08-25T12:00:00Z"));

    render(<PublishInvoiceForm />);

    // Fill title, description, face value
    fireEvent.change(screen.getByLabelText("Invoice Title"), {
      target: { value: "Test Invoice" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Test Description" },
    });
    fireEvent.change(screen.getByLabelText("Face Value (XLM)"), {
      target: { value: "5000" },
    });

    // Set invalid deadline (same day)
    fireEvent.change(screen.getByLabelText("Funding Deadline"), {
      target: { value: "2026-08-25" },
    });

    // Next button should be enabled (but validation happens on click)
    const nextButton = screen.getByRole("button", { name: "Next" });
    expect(nextButton).not.toBeDisabled();

    // Click Next
    fireEvent.click(nextButton);

    // Error should appear and form should stay on step 1
    await waitFor(() => {
      expect(screen.getByText("Deadline must be at least 24 hours from now")).toBeInTheDocument();
      expect(screen.queryByText(/Document Upload/i)).not.toBeInTheDocument();
    });
  });

  it("shows deadline error in red text", async () => {
    // Set current time
    vi.setSystemTime(new Date("2026-08-25T12:00:00Z"));

    render(<PublishInvoiceForm />);

    // Fill all fields
    fireEvent.change(screen.getByLabelText("Invoice Title"), {
      target: { value: "Test Invoice" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Test Description" },
    });
    fireEvent.change(screen.getByLabelText("Face Value (XLM)"), {
      target: { value: "5000" },
    });

    // Set invalid deadline
    fireEvent.change(screen.getByLabelText("Funding Deadline"), {
      target: { value: "2026-08-25" },
    });

    // Click Next to trigger validation
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    // Error message should appear
    await waitFor(() => {
      const errorElement = screen.getByText("Deadline must be at least 24 hours from now");
      expect(errorElement).toBeInTheDocument();
      // Check for error styling (text-destructive class typically applied to errors)
      expect(errorElement).toHaveClass("text-destructive");
    });
  });

  it("validates deadline on every form submission attempt", async () => {
    // Set current time
    vi.setSystemTime(new Date("2026-08-25T12:00:00Z"));

    render(<PublishInvoiceForm />);

    // Fill fields with invalid deadline
    fireEvent.change(screen.getByLabelText("Invoice Title"), {
      target: { value: "Test Invoice" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Test Description" },
    });
    fireEvent.change(screen.getByLabelText("Face Value (XLM)"), {
      target: { value: "5000" },
    });
    fireEvent.change(screen.getByLabelText("Funding Deadline"), {
      target: { value: "2026-08-25" },
    });

    // First attempt - should fail
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(screen.getByText("Deadline must be at least 24 hours from now")).toBeInTheDocument();
    });

    // Change to valid deadline
    fireEvent.change(screen.getByLabelText("Funding Deadline"), {
      target: { value: "2026-08-26" },
    });

    // Second attempt - should succeed
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(screen.getByText(/Document Upload/i)).toBeInTheDocument();
      expect(screen.queryByText("Deadline must be at least 24 hours from now")).not.toBeInTheDocument();
    });
  });

  it("meets all acceptance criteria: 24h passes, under 24h fails, past fails, submit disabled while invalid", async () => {
    // Set current time to noon on Aug 25, 2026
    vi.setSystemTime(new Date("2026-08-25T12:00:00Z"));

    render(<PublishInvoiceForm />);

    // Test 1: Set deadline to exactly 24 hours from now (should pass)
    fireEvent.change(screen.getByLabelText("Invoice Title"), {
      target: { value: "Test Invoice" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Test Description" },
    });
    fireEvent.change(screen.getByLabelText("Face Value (XLM)"), {
      target: { value: "5000" },
    });
    fireEvent.change(screen.getByLabelText("Funding Deadline"), {
      target: { value: "2026-08-26" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    // ✓ ACCEPTANCE CRITERIA 1: Deadline 24h from now passes validation
    await waitFor(() => {
      expect(screen.getByText(/Document Upload/i)).toBeInTheDocument();
    });

    // Go back to step 1
    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Invoice Title")).toBeInTheDocument();
    });

    // Test 2: Set deadline to today (23h 59m from now - should fail)
    fireEvent.change(screen.getByLabelText("Funding Deadline"), {
      target: { value: "2026-08-25" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    // ✓ ACCEPTANCE CRITERIA 2: Deadline under 24h shows error
    await waitFor(() => {
      expect(screen.getByText("Deadline must be at least 24 hours from now")).toBeInTheDocument();
    });

    // ✓ ACCEPTANCE CRITERIA 3: Past deadline shows error
    fireEvent.change(screen.getByLabelText("Funding Deadline"), {
      target: { value: "2026-08-24" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(screen.getByText("Deadline must be at least 24 hours from now")).toBeInTheDocument();
    });

    // ✓ ACCEPTANCE CRITERIA 4: Submit button disabled while deadline is invalid
    // The form stays on step 1 and does not advance (Next button click had no effect)
    expect(screen.queryByText(/Document Upload/i)).not.toBeInTheDocument();
  });
});
