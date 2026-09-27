import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PublishInvoiceForm } from "../PublishInvoiceForm";
import * as api from "@/lib/api";

vi.mock("@/lib/api");
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ jwt: "test-token" }) }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("PublishInvoiceForm field preservation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should retain title field after back navigation from step 2 to step 1", async () => {
    const user = userEvent.setup();
    render(<PublishInvoiceForm />);

    const titleInput = screen.getByLabelText("Invoice Title");
    await user.type(titleInput, "Test Invoice");

    const descriptionInput = screen.getByLabelText("Description");
    await user.type(descriptionInput, "Test Description");

    const faceValueInput = screen.getByLabelText("Face Value (XLM)");
    await user.type(faceValueInput, "1000");

    const deadlineInput = screen.getByLabelText("Funding Deadline");
    await user.type(deadlineInput, "2026-12-31");

    const nextButton = screen.getByRole("button", { name: /Next/i });
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByLabelText("Upload Document")).toBeInTheDocument();
    });

    const backButton = screen.getByRole("button", { name: /Back/i });
    await user.click(backButton);

    await waitFor(() => {
      const titleField = screen.getByLabelText("Invoice Title") as HTMLInputElement;
      expect(titleField.value).toBe("Test Invoice");
    });
  });

  it("should retain description field after back navigation from step 2 to step 1", async () => {
    const user = userEvent.setup();
    render(<PublishInvoiceForm />);

    const titleInput = screen.getByLabelText("Invoice Title");
    await user.type(titleInput, "Test Invoice");

    const descriptionInput = screen.getByLabelText("Description");
    await user.type(descriptionInput, "Test Description");

    const faceValueInput = screen.getByLabelText("Face Value (XLM)");
    await user.type(faceValueInput, "1000");

    const deadlineInput = screen.getByLabelText("Funding Deadline");
    await user.type(deadlineInput, "2026-12-31");

    const nextButton = screen.getByRole("button", { name: /Next/i });
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByLabelText("Upload Document")).toBeInTheDocument();
    });

    const backButton = screen.getByRole("button", { name: /Back/i });
    await user.click(backButton);

    await waitFor(() => {
      const descField = screen.getByLabelText("Description") as HTMLInputElement;
      expect(descField.value).toBe("Test Description");
    });
  });

  it("should retain face value field after back navigation from step 2 to step 1", async () => {
    const user = userEvent.setup();
    render(<PublishInvoiceForm />);

    const titleInput = screen.getByLabelText("Invoice Title");
    await user.type(titleInput, "Test Invoice");

    const descriptionInput = screen.getByLabelText("Description");
    await user.type(descriptionInput, "Test Description");

    const faceValueInput = screen.getByLabelText("Face Value (XLM)");
    await user.type(faceValueInput, "1000");

    const deadlineInput = screen.getByLabelText("Funding Deadline");
    await user.type(deadlineInput, "2026-12-31");

    const nextButton = screen.getByRole("button", { name: /Next/i });
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByLabelText("Upload Document")).toBeInTheDocument();
    });

    const backButton = screen.getByRole("button", { name: /Back/i });
    await user.click(backButton);

    await waitFor(() => {
      const faceValueField = screen.getByDisplayValue("1000") as HTMLInputElement;
      expect(faceValueField.value).toBe("1000");
    });
  });

  it("should retain funding deadline field after back navigation from step 2 to step 1", async () => {
    const user = userEvent.setup();
    render(<PublishInvoiceForm />);

    const titleInput = screen.getByLabelText("Invoice Title");
    await user.type(titleInput, "Test Invoice");

    const descriptionInput = screen.getByLabelText("Description");
    await user.type(descriptionInput, "Test Description");

    const faceValueInput = screen.getByLabelText("Face Value (XLM)");
    await user.type(faceValueInput, "1000");

    const deadlineInput = screen.getByLabelText("Funding Deadline");
    await user.type(deadlineInput, "2026-12-31");

    const nextButton = screen.getByRole("button", { name: /Next/i });
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByLabelText("Upload Document")).toBeInTheDocument();
    });

    const backButton = screen.getByRole("button", { name: /Back/i });
    await user.click(backButton);

    await waitFor(() => {
      const deadlineField = screen.getByLabelText("Funding Deadline") as HTMLInputElement;
      expect(deadlineField.value).toBe("2026-12-31");
    });
  });

  it("should not reset any fields to empty on back navigation", async () => {
    const user = userEvent.setup();
    render(<PublishInvoiceForm />);

    const titleInput = screen.getByLabelText("Invoice Title");
    await user.type(titleInput, "Test Invoice");

    const descriptionInput = screen.getByLabelText("Description");
    await user.type(descriptionInput, "Test Description");

    const faceValueInput = screen.getByLabelText("Face Value (XLM)");
    await user.type(faceValueInput, "1000");

    const deadlineInput = screen.getByLabelText("Funding Deadline");
    await user.type(deadlineInput, "2026-12-31");

    const nextButton = screen.getByRole("button", { name: /Next/i });
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByLabelText("Upload Document")).toBeInTheDocument();
    });

    const backButton = screen.getByRole("button", { name: /Back/i });
    await user.click(backButton);

    await waitFor(() => {
      const titleField = screen.getByLabelText("Invoice Title") as HTMLInputElement;
      const descField = screen.getByLabelText("Description") as HTMLInputElement;
      const deadlineField = screen.getByLabelText("Funding Deadline") as HTMLInputElement;

      expect(titleField.value).not.toBe("");
      expect(descField.value).not.toBe("");
      expect(deadlineField.value).not.toBe("");
    });
  });
});
