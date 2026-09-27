import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ThemeToggle } from "../ThemeToggle";

const mockSetTheme = vi.fn();
let mockResolvedTheme: string | undefined = "light";

vi.mock("next-themes", () => ({
  useTheme: () => ({
    resolvedTheme: mockResolvedTheme,
    setTheme: mockSetTheme,
  }),
}));

describe("ThemeToggle", () => {
  beforeEach(() => {
    mockSetTheme.mockClear();
    mockResolvedTheme = "light";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a nav bar toggle for dark mode", () => {
    render(<ThemeToggle />);

    expect(screen.getByRole("button", { name: "Toggle dark mode" })).toBeInTheDocument();
  });

  it("overrides the system preference with dark mode on click", async () => {
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole("button", { name: "Toggle dark mode" }));

    await waitFor(() => expect(mockSetTheme).toHaveBeenCalledWith("dark"));
  });

  it("switches back to light mode when dark is active", async () => {
    mockResolvedTheme = "dark";
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole("button", { name: "Toggle dark mode" }));

    await waitFor(() => expect(mockSetTheme).toHaveBeenCalledWith("light"));
  });
});
