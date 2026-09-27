import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { WalletActivityFeed } from "../WalletActivityFeed";
import type { WalletActivityEvent } from "@/lib/api";

const useWalletActivity = vi.fn();
const fetchNextPage = vi.fn();
const observe = vi.fn();
let intersectCallback: ((entries: unknown[]) => void) | null = null;

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ address: "GTESTADDRESS", jwt: "jwt-token" }),
}));

vi.mock("@/hooks/useWalletActivity", () => ({
  useWalletActivity: (...args: unknown[]) => useWalletActivity(...args),
}));

class MockIntersectionObserver {
  constructor(callback: (entries: unknown[]) => void) {
    intersectCallback = callback;
  }
  observe = observe;
  unobserve = vi.fn();
  disconnect = vi.fn();
}

vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

function makeEvent(overrides: Partial<WalletActivityEvent> = {}): WalletActivityEvent {
  return {
    id: "evt-1",
    type: "buy",
    keyId: "key-1",
    keyName: "Alice Key",
    amount: 5,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

function mockFeed(events: WalletActivityEvent[], overrides: Record<string, unknown> = {}) {
  useWalletActivity.mockReturnValue({
    data: { pages: [{ events, has_more: false, next_cursor: null }] },
    fetchNextPage,
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
    ...overrides,
  });
}

describe("WalletActivityFeed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    intersectCallback = null;
  });

  it("renders every event type with its own icon", () => {
    mockFeed([
      makeEvent({ id: "e-buy", type: "buy" }),
      makeEvent({ id: "e-sell", type: "sell" }),
      makeEvent({ id: "e-transfer", type: "transfer" }),
      makeEvent({ id: "e-burn", type: "burn" }),
      makeEvent({ id: "e-dividend", type: "dividend" }),
    ]);

    render(<WalletActivityFeed />);

    expect(screen.getByTestId("activity-icon-buy")).toHaveClass("text-green-700");
    expect(screen.getByTestId("activity-icon-sell")).toHaveClass("text-red-700");
    expect(screen.getByTestId("activity-icon-transfer")).toHaveClass("text-blue-700");
    expect(screen.getByTestId("activity-icon-burn")).toHaveClass("text-orange-700");
    expect(screen.getByTestId("activity-icon-dividend")).toHaveClass("text-yellow-700");
  });

  it("includes the key name and amount in the event description", () => {
    mockFeed([makeEvent({ id: "e-buy", type: "buy", amount: 5, keyName: "Alice Key" })]);

    render(<WalletActivityFeed />);

    expect(screen.getByTestId("activity-description-e-buy")).toHaveTextContent(
      "Bought 5 Alice Key keys"
    );
  });

  it("renders timestamps in relative format", () => {
    mockFeed([makeEvent({ id: "e-buy" })]);

    render(<WalletActivityFeed />);

    expect(screen.getByTestId("activity-timestamp-e-buy")).toHaveTextContent(
      "about 2 hours ago"
    );
  });

  it("shows the empty state when there is no activity", () => {
    mockFeed([]);

    render(<WalletActivityFeed />);

    expect(screen.getByTestId("wallet-activity-empty")).toHaveTextContent(
      "No activity yet"
    );
  });

  it("loads the next page when the sentinel scrolls into view", () => {
    mockFeed([makeEvent({ id: "e-buy" })], { hasNextPage: true });

    render(<WalletActivityFeed />);
    intersectCallback?.([{ isIntersecting: true }]);

    expect(fetchNextPage).toHaveBeenCalled();
  });

  it("does not load the next page when there are no further pages", () => {
    mockFeed([makeEvent({ id: "e-buy" })], { hasNextPage: false });

    render(<WalletActivityFeed />);
    intersectCallback?.([{ isIntersecting: true }]);

    expect(fetchNextPage).not.toHaveBeenCalled();
  });
});
