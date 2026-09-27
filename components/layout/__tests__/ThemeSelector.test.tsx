import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ThemeSelector } from "../ThemeSelector";

const mockSetTheme = vi.fn();
let mockTheme: string | undefined = "system";

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: mockTheme, setTheme: mockSetTheme }),
}));

describe("ThemeSelector (#386)", () => {
  beforeEach(() => {
    mockSetTheme.mockClear();
    mockTheme = "system";
  });

  it("marks the stored preference as selected", async () => {
    mockTheme = "dark";
    render(<ThemeSelector />);
    await waitFor(() =>
      expect(screen.getByRole("radio", { name: "Dark" })).toHaveAttribute("aria-checked", "true"),
    );
    expect(screen.getByRole("radio", { name: "System" })).toHaveAttribute("aria-checked", "false");
  });

  it("stores a manual override", () => {
    render(<ThemeSelector />);
    fireEvent.click(screen.getByRole("radio", { name: "Light" }));
    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("lets the user go back to following the system preference", () => {
    mockTheme = "dark";
    render(<ThemeSelector />);
    fireEvent.click(screen.getByRole("radio", { name: "System" }));
    expect(mockSetTheme).toHaveBeenCalledWith("system");
  });
});
