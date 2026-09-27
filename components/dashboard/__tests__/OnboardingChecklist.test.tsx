import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OnboardingChecklist, ChecklistKycStatus } from "../OnboardingChecklist";

describe("OnboardingChecklist", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  const baseProps = {
    walletConnected: false,
    kycStatus: "not_submitted" as ChecklistKycStatus,
    invoiceCount: 0,
  };

  it("Step 1 (connect wallet) reflects the real wallet connection state", () => {
    const { rerender } = render(
      <OnboardingChecklist {...baseProps} walletConnected={false} />
    );
    expect(screen.getByTestId("step-1-incomplete")).toBeInTheDocument();

    rerender(<OnboardingChecklist {...baseProps} walletConnected={true} />);
    expect(screen.getByTestId("step-1-complete")).toBeInTheDocument();
    expect(screen.queryByTestId("step-1-incomplete")).not.toBeInTheDocument();
  });

  it("Step 2 (KYC) is complete only when the API reports approved", () => {
    const { rerender } = render(
      <OnboardingChecklist {...baseProps} kycStatus="pending" />
    );
    expect(screen.getByTestId("step-2-incomplete")).toBeInTheDocument();

    rerender(
      <OnboardingChecklist {...baseProps} kycStatus="approved" />
    );
    expect(screen.getByTestId("step-2-complete")).toBeInTheDocument();
    expect(screen.queryByTestId("step-2-incomplete")).not.toBeInTheDocument();
  });

  it("Step 3 (first invoice) is complete once at least one invoice exists", () => {
    const { rerender } = render(
      <OnboardingChecklist {...baseProps} invoiceCount={0} />
    );
    expect(screen.getByTestId("step-3-incomplete")).toBeInTheDocument();

    rerender(<OnboardingChecklist {...baseProps} invoiceCount={1} />);
    expect(screen.getByTestId("step-3-complete")).toBeInTheDocument();
    expect(screen.queryByTestId("step-3-incomplete")).not.toBeInTheDocument();
  });

  it("each incomplete step links to its action page", () => {
    render(<OnboardingChecklist {...baseProps} />);

    expect(screen.getByTestId("step-1-link")).toHaveAttribute("href", "/connect-wallet");
    expect(screen.getByTestId("step-2-link")).toHaveAttribute("href", "/kyc/status");
    expect(screen.getByTestId("step-3-link")).toHaveAttribute("href", "/seller/publish");
  });

  it("shows the progress percentage and updates it as steps complete", () => {
    const { rerender } = render(<OnboardingChecklist {...baseProps} />);
    expect(screen.getByTestId("checklist-progress")).toHaveTextContent("0% complete");

    rerender(
      <OnboardingChecklist {...baseProps} walletConnected={true} />
    );
    expect(screen.getByTestId("checklist-progress")).toHaveTextContent("33% complete");

    rerender(
      <OnboardingChecklist
        {...baseProps}
        walletConnected={true}
        kycStatus="approved"
      />
    );
    expect(screen.getByTestId("checklist-progress")).toHaveTextContent("67% complete");
  });

  it("auto-dismisses when all steps are complete", () => {
    render(
      <OnboardingChecklist
        walletConnected={true}
        kycStatus="approved"
        invoiceCount={1}
      />
    );
    expect(screen.queryByTestId("onboarding-checklist")).not.toBeInTheDocument();
  });

  it("dismissal writes to localStorage and hides the checklist", () => {
    render(<OnboardingChecklist {...baseProps} />);
    expect(screen.getByTestId("onboarding-checklist")).toBeInTheDocument();

    const dismissBtn = screen.getByTestId("dismiss-checklist-btn");
    fireEvent.click(dismissBtn);

    expect(screen.queryByTestId("onboarding-checklist")).not.toBeInTheDocument();
    expect(localStorage.getItem("onboarding_checklist_dismissed")).toBe("true");
  });
});
