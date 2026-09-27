import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SettlementReturnCard } from "../SettlementReturnCard";

describe("SettlementReturnCard", () => {
  it("renders full payout and 100% return when payout equals commitment", () => {
    render(<SettlementReturnCard payout={3000} committedAmount={3000} />);

    expect(screen.getByText("3,000 XLM")).toBeInTheDocument();
    expect(screen.getByText("100% return")).toBeInTheDocument();
  });

  it("renders partial payout and 50% return", () => {
    render(<SettlementReturnCard payout={1500} committedAmount={3000} />);

    expect(screen.getByText("1,500 XLM")).toBeInTheDocument();
    expect(screen.getByText("50% return")).toBeInTheDocument();
  });

  it("renders zero payout without crashing", () => {
    render(<SettlementReturnCard payout={0} committedAmount={3000} />);

    expect(screen.getByText("0 XLM")).toBeInTheDocument();
    expect(screen.getByText("0% return")).toBeInTheDocument();
  });

  it("does not show skeleton when payout is zero", () => {
    render(<SettlementReturnCard payout={0} committedAmount={3000} />);

    expect(screen.queryByTestId("settlement-return-skeleton")).not.toBeInTheDocument();
  });

  it("renders a skeleton card when payout is null (not yet processed)", () => {
    render(<SettlementReturnCard payout={null} committedAmount={3000} />);

    expect(screen.getByTestId("settlement-return-skeleton")).toBeInTheDocument();
    expect(screen.queryByText(/XLM/)).not.toBeInTheDocument();
  });

  it("formats large XLM amounts with thousand separators", () => {
    render(<SettlementReturnCard payout={12500} committedAmount={12500} />);

    expect(screen.getByText("12,500 XLM")).toBeInTheDocument();
  });
});
