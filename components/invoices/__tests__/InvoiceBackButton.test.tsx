import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { InvoiceBackButton } from "../InvoiceBackButton";

const mockBack = vi.fn();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
  }),
}));

describe("InvoiceBackButton", () => {
  beforeEach(() => {
    mockBack.mockReset();
    mockPush.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is not rendered in an SSR context", () => {
    const html = renderToString(<InvoiceBackButton />);
    expect(html).toBe("");
  });

  it("navigates to the previous page when history exists", () => {
    Object.defineProperty(window, "history", {
      configurable: true,
      value: { length: 3 },
    });

    render(<InvoiceBackButton />);
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("falls back to the marketplace when no history entry exists", () => {
    Object.defineProperty(window, "history", {
      configurable: true,
      value: { length: 1 },
    });

    render(<InvoiceBackButton />);
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));

    expect(mockPush).toHaveBeenCalledWith("/marketplace");
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("is positioned in the document after mount", () => {
    render(<InvoiceBackButton />);
    expect(screen.getByTestId("invoice-back-button")).toBeInTheDocument();
  });
});
