import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VoteModal } from "../VoteModal";
import type { GovernanceProposal } from "@/lib/api";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    address: "GVOTER123",
    jwt: "token-123",
  }),
}));

const mutateAsync = vi.fn();

let mockIsPending = false;
let mockIsError = false;
let mockError: unknown = null;
const reset = vi.fn();

vi.mock("@/hooks/useCreatorKeys", () => ({
  useCastGovernanceVoteMutation: () => ({
    mutateAsync,
    isPending: mockIsPending,
    isError: mockIsError,
    error: mockError,
    reset,
  }),
}));

const proposal: GovernanceProposal = {
  id: "proposal-1",
  title: "Should we ship v2?",
  status: "active",
  expires_at: "2030-01-01T00:00:00Z",
  user_voting_weight: 1000,
  user_has_voted: false,
  options: [
    { label: "Yes", vote_weight: 100 },
    { label: "No", vote_weight: 100 },
  ],
};

const onOpenChange = vi.fn();

function renderModal() {
  return render(
    <VoteModal
      keyId="key-1"
      proposal={proposal}
      open
      onOpenChange={onOpenChange}
    />
  );
}

describe("VoteModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutateAsync.mockResolvedValue(undefined);
    mockIsPending = false;
    mockIsError = false;
    mockError = null;
  });

  it("disables the Confirm button until an option is selected", () => {
    renderModal();
    expect(screen.getByRole("button", { name: /confirm vote/i })).toBeDisabled();
  });

  it("submits option index 0 when the first option is selected and confirmed", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getAllByRole("radio")[0]);
    await user.click(screen.getByRole("button", { name: /confirm vote/i }));

    expect(mutateAsync).toHaveBeenCalledExactlyOnceWith({
      proposalId: "proposal-1",
      optionIndex: 0,
      walletAddress: "GVOTER123",
      token: "token-123",
    });
  });

  it("submits option index 1 when the second option is selected and confirmed", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getAllByRole("radio")[1]);
    await user.click(screen.getByRole("button", { name: /confirm vote/i }));

    expect(mutateAsync).toHaveBeenCalledExactlyOnceWith({
      proposalId: "proposal-1",
      optionIndex: 1,
      walletAddress: "GVOTER123",
      token: "token-123",
    });
  });

  it("disables the Confirm button once an option is selected", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getAllByRole("radio")[0]);
    expect(screen.getByRole("button", { name: /confirm vote/i })).toBeEnabled();
  });

  it("disables the Confirm button and shows 'Vote recorded' after a successful submission", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getAllByRole("radio")[0]);
    await user.click(screen.getByRole("button", { name: /confirm vote/i }));

    expect(
      screen.getByText("Your vote has been recorded")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirm vote/i })).toBeDisabled();
  });

  it("shows an error message and re-enables the Confirm button after a failed submission", async () => {
    mutateAsync.mockRejectedValueOnce(new Error("Contract reverted"));
    const user = userEvent.setup();
    const { rerender } = renderModal();

    await user.click(screen.getAllByRole("radio")[1]);
    await user.click(screen.getByRole("button", { name: /confirm vote/i }));

    mockIsError = true;
    mockError = new Error("Contract reverted");
    rerender(
      <VoteModal
        keyId="key-1"
        proposal={proposal}
        open
        onOpenChange={onOpenChange}
      />
    );

    expect(
      screen.getByTestId("vote-error-message")
    ).toHaveTextContent("Contract reverted");
    expect(screen.getByRole("button", { name: /confirm vote/i })).toBeEnabled();
    expect(screen.queryByText("Your vote has been recorded")).not.toBeInTheDocument();
  });
});
