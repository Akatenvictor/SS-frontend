import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useBurnCreatorKeyMutation } from "@/hooks/useCreatorKeys";

const burnCreatorKey = vi.fn();
const successToast = vi.fn();

vi.mock("@/lib/api", () => ({
  burnCreatorKey: (...args: unknown[]) => burnCreatorKey(...args),
  buyCreatorKey: vi.fn(),
  castGovernanceVote: vi.fn(),
  createGovernanceProposal: vi.fn(),
  fetchCreatorKeyDetail: vi.fn(),
  fetchKeySupply: vi.fn(),
  fetchKeyProposals: vi.fn(),
  fetchKeyWhitelistStatus: vi.fn(),
  transferCreatorKey: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => successToast(...args),
    error: vi.fn(),
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useBurnCreatorKeyMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the updated circulating supply in the success toast", async () => {
    burnCreatorKey.mockResolvedValue({ success: true, circulatingSupply: 9500 });

    const { result } = renderHook(() => useBurnCreatorKeyMutation("key-1"), {
      wrapper,
    });

    result.current.mutate({ quantity: 500, walletAddress: "GTEST", token: null });

    await waitFor(() => expect(successToast).toHaveBeenCalled());
    expect(successToast).toHaveBeenCalledWith(
      "Key burned successfully. New circulating supply: 9,500"
    );
  });

  it("falls back to a plain success message when supply is not returned", async () => {
    burnCreatorKey.mockResolvedValue({ success: true, circulatingSupply: null });

    const { result } = renderHook(() => useBurnCreatorKeyMutation("key-1"), {
      wrapper,
    });

    result.current.mutate({ quantity: 1, walletAddress: "GTEST", token: null });

    await waitFor(() => expect(successToast).toHaveBeenCalled());
    expect(successToast).toHaveBeenCalledWith("Key burned successfully");
  });
});
