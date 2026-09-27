import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateProposalModal } from "../CreateProposalModal";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    address: "GCREATORTEST",
    jwt: null,
  }),
}));

const mutateAsync = vi.fn();

vi.mock("@/hooks/useCreatorKeys", () => ({
  useCreateProposalMutation: () => ({
    mutateAsync,
    isPending: false,
  }),
}));

async function openModal() {
  const user = userEvent.setup();
  render(<CreateProposalModal keyId="key-1" />);
  await user.click(screen.getByTestId("create-proposal-button"));
  return user;
}

describe("CreateProposalModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("disables submit until title and at least 2 options are filled", async () => {
    const user = await openModal();
    expect(screen.getByTestId("submit-proposal-button")).toBeDisabled();

    await user.type(screen.getByTestId("proposal-title-input"), "Should we ship v2?");
    expect(screen.getByTestId("submit-proposal-button")).toBeDisabled();

    await user.type(screen.getByTestId("proposal-option-input-0"), "Yes");
    expect(screen.getByTestId("submit-proposal-button")).toBeDisabled();

    await user.type(screen.getByTestId("proposal-option-input-1"), "No");
    expect(screen.getByTestId("submit-proposal-button")).toBeEnabled();
  });

  it("does not allow more than 4 options", async () => {
    const user = await openModal();
    await user.click(screen.getByTestId("add-option-button"));
    await user.click(screen.getByTestId("add-option-button"));

    expect(screen.getByTestId("add-option-button")).toBeDisabled();
    expect(screen.queryByTestId("proposal-option-input-4")).not.toBeInTheDocument();
  });

  it("submits with the correct title, options, and duration", async () => {
    const user = await openModal();
    await user.type(screen.getByTestId("proposal-title-input"), "Add treasury vote");
    await user.type(screen.getByTestId("proposal-option-input-0"), "Approve");
    await user.type(screen.getByTestId("proposal-option-input-1"), "Reject");

    await user.click(screen.getByTestId("submit-proposal-button"));

    expect(mutateAsync).toHaveBeenCalledWith({
      input: {
        title: "Add treasury vote",
        options: ["Approve", "Reject"],
        durationDays: 7,
      },
      walletAddress: "GCREATORTEST",
      token: null,
    });
  });
});
