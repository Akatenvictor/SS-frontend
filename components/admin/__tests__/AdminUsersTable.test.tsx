import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { AdminUsersTable } from "../AdminUsersTable";
import * as api from "@/lib/api";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ jwt: "admin-token" }),
}));

vi.mock("@/hooks/usePageTitle", () => ({
  usePageTitle: vi.fn(),
}));

function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const mockUsers: api.AdminUserRow[] = [
  {
    wallet: "GWALLET1111111111111111111111111111111111111111111111",
    role: "seller",
    suspended: false,
    joined_at: "2026-08-20",
  },
  {
    wallet: "GWALLET2222222222222222222222222222222222222222222222",
    role: "user",
    suspended: true,
    joined_at: "2026-08-22",
  },
];

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AdminUsersTable", () => {
  it("lists users with role, status, and join date", async () => {
    const spy = vi.spyOn(api, "fetchAdminUsers").mockResolvedValue({
      users: mockUsers,
      has_more: false,
      next_cursor: null,
    });

    renderWithClient(<AdminUsersTable />);

    expect(await screen.findByText("GWAL...1111")).toBeInTheDocument();
    expect(screen.getByText("GWAL...2222")).toBeInTheDocument();
    expect(screen.getByText("seller")).toBeInTheDocument();
    expect(screen.getByTestId("user-status-active")).toBeInTheDocument();
    const suspendedBadge = screen.getByTestId("user-status-suspended");
    expect(suspendedBadge).toBeInTheDocument();
    expect(screen.getByText("8/20/2026")).toBeInTheDocument();

    expect(spy).toHaveBeenCalledWith("", undefined, "admin-token");
  });

  it("renders suspended users with a distinct row treatment", async () => {
    vi.spyOn(api, "fetchAdminUsers").mockResolvedValue({
      users: mockUsers,
      has_more: false,
      next_cursor: null,
    });

    renderWithClient(<AdminUsersTable />);

    const suspendedRow = await screen.findByTestId(
      "user-row-GWALLET2222222222222222222222222222222222222222222222"
    );
    expect(suspendedRow.getAttribute("data-suspended")).toBe("true");
    expect(suspendedRow.className).toContain("bg-destructive/5");

    const activeRow = screen.getByTestId(
      "user-row-GWALLET1111111111111111111111111111111111111111111111"
    );
    expect(activeRow.getAttribute("data-suspended")).toBe("false");
  });

  it("searches by wallet address", async () => {
    const spy = vi.spyOn(api, "fetchAdminUsers").mockResolvedValue({
      users: [mockUsers[0]!],
      has_more: false,
      next_cursor: null,
    });

    renderWithClient(<AdminUsersTable />);

    fireEvent.change(screen.getByTestId("user-search-input"), {
      target: { value: "GWALLET1111" },
    });
    fireEvent.click(screen.getByTestId("user-search-button"));

    await waitFor(() => {
      expect(spy).toHaveBeenLastCalledWith("GWALLET1111", undefined, "admin-token");
    });
  });

  it("saves a role change after confirmation and reflects it via refetch", async () => {
    const roleSpy = vi
      .spyOn(api, "updateAdminUserRole")
      .mockResolvedValue({ success: true });
    vi.spyOn(api, "fetchAdminUsers")
      .mockResolvedValueOnce({
        users: mockUsers,
        has_more: false,
        next_cursor: null,
      })
      .mockResolvedValue({
        users: [{ ...mockUsers[0]!, role: "admin" }],
        has_more: false,
        next_cursor: null,
      });

    renderWithClient(<AdminUsersTable />);

    // Open the role dropdown for the first user and pick a new role.
    fireEvent.click(
      await screen.findByRole("combobox", { name: "Role for GWAL...1111" })
    );
    fireEvent.click(await screen.findByRole("option", { name: "admin" }));

    // Confirmation modal must gate the actual save.
    expect(roleSpy).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("role-confirm-save"));

    await waitFor(() => {
      expect(roleSpy).toHaveBeenCalledWith(
        "GWALLET1111111111111111111111111111111111111111111111",
        "admin",
        "admin-token"
      );
      expect(toast.success).toHaveBeenCalledWith("Role updated to admin");
    });

    // The table reflects the new role after the refetch.
    expect(await screen.findAllByText("admin")).toBeTruthy();
  });

  it("requires confirmation before suspending a user", async () => {
    const suspendSpy = vi.spyOn(api, "suspendAdminUser").mockResolvedValue({ success: true });
    vi.spyOn(api, "fetchAdminUsers").mockResolvedValue({
      users: mockUsers,
      has_more: false,
      next_cursor: null,
    });

    renderWithClient(<AdminUsersTable />);

    fireEvent.click(
      await screen.findByTestId(
        "user-suspend-toggle-GWALLET1111111111111111111111111111111111111111111111"
      )
    );

    // Modal prevents the accidental action.
    expect(suspendSpy).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("suspend-confirm-action"));

    await waitFor(() => {
      expect(suspendSpy).toHaveBeenCalledWith(
        "GWALLET1111111111111111111111111111111111111111111111",
        "admin-token"
      );
      expect(toast.success).toHaveBeenCalledWith("User suspended");
    });
  });

  it("shows a toast error when the role update fails", async () => {
    vi.spyOn(api, "fetchAdminUsers").mockResolvedValue({
      users: mockUsers,
      has_more: false,
      next_cursor: null,
    });
    vi.spyOn(api, "updateAdminUserRole").mockRejectedValue(new Error("Update failed"));

    renderWithClient(<AdminUsersTable />);

    fireEvent.click(
      await screen.findByRole("combobox", { name: "Role for GWAL...1111" })
    );
    fireEvent.click(await screen.findByRole("option", { name: "admin" }));
    fireEvent.click(screen.getByTestId("role-confirm-save"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Update failed");
    });
  });
});
