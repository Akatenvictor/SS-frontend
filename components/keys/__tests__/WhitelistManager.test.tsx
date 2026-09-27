import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WhitelistManager } from "../WhitelistManager";
import type { WhitelistEntry } from "@/lib/api";

const useKeyWhitelist = vi.fn();
const fetchNextPage = vi.fn();
const addMutateAsync = vi.fn();
const removeMutateAsync = vi.fn();
const modeMutate = vi.fn();
let intersectCallback: ((entries: unknown[]) => void) | null = null;

const VALID_ADDRESS =
  "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ address: "GTESTADDRESS", jwt: "jwt-token" }),
}));

vi.mock("@/hooks/useWhitelist", () => ({
  useKeyWhitelist: (...args: unknown[]) => useKeyWhitelist(...args),
  useAddWhitelistAddressMutation: () => ({
    mutateAsync: addMutateAsync,
    isPending: false,
  }),
  useRemoveWhitelistAddressMutation: () => ({
    mutateAsync: removeMutateAsync,
    isPending: false,
  }),
  useUpdateWhitelistModeMutation: () => ({
    mutate: modeMutate,
    isPending: false,
  }),
}));

class MockIntersectionObserver {
  constructor(callback: (entries: unknown[]) => void) {
    intersectCallback = callback;
  }
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

function mockWhitelist(
  entries: WhitelistEntry[],
  overrides: Record<string, unknown> = {}
) {
  useKeyWhitelist.mockReturnValue({
    data: {
      pages: [
        {
          entries,
          whitelist_enabled: true,
          has_more: false,
          next_cursor: null,
        },
      ],
    },
    fetchNextPage,
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
    ...overrides,
  });
}

describe("WhitelistManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    intersectCallback = null;
  });

  it("toggles whitelist mode", async () => {
    const user = userEvent.setup();
    mockWhitelist([]);

    render(<WhitelistManager keyId="key-1" />);
    await user.click(screen.getByTestId("whitelist-mode-toggle"));

    expect(modeMutate).toHaveBeenCalledWith({ enabled: false, token: "jwt-token" });
  });

  it("adds a valid Stellar address", async () => {
    const user = userEvent.setup();
    mockWhitelist([]);

    render(<WhitelistManager keyId="key-1" />);
    await user.type(screen.getByTestId("whitelist-address-input"), VALID_ADDRESS);
    await user.click(screen.getByTestId("whitelist-add-button"));

    expect(addMutateAsync).toHaveBeenCalledWith({
      address: VALID_ADDRESS,
      token: "jwt-token",
    });
  });

  it("shows an inline error and blocks submission for an invalid address", async () => {
    const user = userEvent.setup();
    mockWhitelist([]);

    render(<WhitelistManager keyId="key-1" />);
    await user.type(screen.getByTestId("whitelist-address-input"), "not-an-address");

    expect(screen.getByTestId("whitelist-address-error")).toHaveTextContent(
      "Invalid Stellar address"
    );
    expect(screen.getByTestId("whitelist-add-button")).toBeDisabled();
    expect(addMutateAsync).not.toHaveBeenCalled();
  });

  it("removes an address only after the confirmation dialog is confirmed", async () => {
    const user = userEvent.setup();
    mockWhitelist([{ address: VALID_ADDRESS }]);

    render(<WhitelistManager keyId="key-1" />);
    await user.click(screen.getByTestId(`whitelist-remove-${VALID_ADDRESS}`));

    expect(screen.getByTestId("whitelist-remove-dialog")).toBeInTheDocument();
    expect(removeMutateAsync).not.toHaveBeenCalled();

    await user.click(screen.getByTestId("whitelist-remove-confirm"));

    expect(removeMutateAsync).toHaveBeenCalledWith({
      address: VALID_ADDRESS,
      token: "jwt-token",
    });
  });

  it("loads the next page when the list bottom scrolls into view", () => {
    mockWhitelist([{ address: VALID_ADDRESS }], { hasNextPage: true });

    render(<WhitelistManager keyId="key-1" />);
    intersectCallback?.([{ isIntersecting: true }]);

    expect(fetchNextPage).toHaveBeenCalled();
  });
});
