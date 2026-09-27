import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EarlyRepaymentBanner } from "../EarlyRepaymentBanner";

describe("EarlyRepaymentBanner", () => {
  const defaultProps = {
    amount: 1000,
    originalMaturityDate: "2024-12-31",
    newSettlementDate: "2024-11-15",
  };

  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("renders early repayment information", () => {
    render(<EarlyRepaymentBanner {...defaultProps} />);

    expect(screen.getByText("Early Repayment Notice")).toBeInTheDocument();
    expect(screen.getByText(/1,000 XLM/)).toBeInTheDocument();
    expect(screen.getByText(/12\/31\/2024/)).toBeInTheDocument();
    expect(screen.getByText(/11\/15\/2024/)).toBeInTheDocument();
  });

  it("dismisses when close button is clicked", async () => {
    const user = userEvent.setup();
    render(<EarlyRepaymentBanner {...defaultProps} />);

    const dismissButton = screen.getByLabelText("Dismiss");
    await user.click(dismissButton);

    expect(screen.queryByText("Early Repayment Notice")).not.toBeInTheDocument();
  });

  it("dismisses when Acknowledge button is clicked", async () => {
    const user = userEvent.setup();
    render(<EarlyRepaymentBanner {...defaultProps} />);

    const acknowledgeButton = screen.getByText("Acknowledge");
    await user.click(acknowledgeButton);

    expect(screen.queryByText("Early Repayment Notice")).not.toBeInTheDocument();
  });

  it("persists dismissal in sessionStorage", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<EarlyRepaymentBanner {...defaultProps} />);

    const dismissButton = screen.getByLabelText("Dismiss");
    await user.click(dismissButton);
    unmount();

    // Re-render — should stay dismissed because sessionStorage persists
    render(<EarlyRepaymentBanner {...defaultProps} />);
    expect(screen.queryByText("Early Repayment Notice")).not.toBeInTheDocument();
  });

  it("displays repayment amount correctly", () => {
    render(<EarlyRepaymentBanner {...defaultProps} amount={5000} />);
    expect(screen.getByText(/5,000 XLM/)).toBeInTheDocument();
  });

  it("displays dates in correct format", () => {
    render(<EarlyRepaymentBanner {...defaultProps} />);
    expect(screen.getByText(/Repayment Amount:/)).toBeInTheDocument();
    expect(screen.getByText(/Original Maturity:/)).toBeInTheDocument();
    expect(screen.getByText(/New Settlement Date:/)).toBeInTheDocument();
  });
});
