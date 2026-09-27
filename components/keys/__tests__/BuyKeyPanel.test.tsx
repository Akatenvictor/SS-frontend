import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BuyKeyPanel } from "../BuyKeyPanel";
import type { CreatorKeyDetail } from "@/lib/api";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    address: "GTEST",
    jwt: null,
    loginWithWallet: vi.fn(),
    isConnecting: false,
  }),
}));

vi.mock("@/hooks/useCreatorKeys", () => ({
  useKeyWhitelistStatus: vi.fn(() => ({
    data: { whitelist_enabled: false, is_approved: true },
    isLoading: false,
  })),
  useBuyCreatorKeyMutation: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

const creatorKey: CreatorKeyDetail = {
  id: "key-1",
  title: "Creator Key",
  creator_name: "Creator",
  price: 10,
  holders_count: 2,
  whitelist_enabled: false,
};

describe("BuyKeyPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("disables the Buy button and shows sold out when remainingMintable is 0", () => {
    render(
      <BuyKeyPanel
        creatorKey={creatorKey}
        supply={{
          circulatingSupply: 100,
          supplyCap: 100,
          remainingMintable: 0,
        }}
      />
    );

    expect(screen.getByTestId("sold-out-badge")).toHaveTextContent("Sold Out");
    expect(screen.getByTestId("buy-key-button")).toBeDisabled();
    expect(screen.getByTestId("buy-key-button")).toHaveTextContent("Sold Out");
  });
});
