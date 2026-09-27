import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PositionCard, formatSharePercent } from "../PositionCard";
import type { InvestmentPosition } from "@/lib/portfolio";

// PositionCard renders PositionTransferModal for every "active" position
// (issue #119); this file only exercises PositionCard's own rendering, so
// it's mocked here the same way InvoiceDetail.test.tsx mocks
// CountdownTimer/DocumentPreview — PositionTransferModal's own behaviour is
// covered by its dedicated test file (issue #115).
vi.mock("../PositionTransferModal", () => ({
  PositionTransferModal: ({ position }: { position: InvestmentPosition }) => (
    <button type="button" data-testid={`transfer-position-button-${position.invoice_id}`}>
      Transfer Position
    </button>
  ),
}));

function makePosition(overrides: Partial<InvestmentPosition> = {}): InvestmentPosition {
  return {
    invoice_id: "inv-1",
    invoice_title: "Acme receivable",
    committed_amount: 3000,
    status: "active",
    share_percent: 30,
    ...overrides,
  };
}

describe("formatSharePercent", () => {
  it("rounds share percentage to two decimal places", () => {
    expect(formatSharePercent(30.556)).toBe("30.56%");
  });

  it("renders whole percentages without trailing zeros", () => {
    expect(formatSharePercent(100)).toBe("100%");
    expect(formatSharePercent(30)).toBe("30%");
  });

  it("returns a dash placeholder for null or undefined", () => {
    expect(formatSharePercent(null)).toBe("—");
    expect(formatSharePercent(undefined)).toBe("—");
  });
});

describe("PositionCard", () => {
  it("renders committed XLM and share percentage correctly", () => {
    render(<PositionCard position={makePosition({ committed_amount: 3000, share_percent: 30 })} />);

    expect(screen.getByTestId("position-committed")).toHaveTextContent(
      "3,000.00 XLM committed"
    );
    expect(screen.getByTestId("position-share")).toHaveTextContent("30%");
  });

  it("renders 100% share without crashing", () => {
    render(<PositionCard position={makePosition({ share_percent: 100 })} />);

    expect(screen.getByTestId("position-share")).toHaveTextContent("100%");
  });

  it("renders a dash placeholder when share percentage is null", () => {
    render(<PositionCard position={makePosition({ share_percent: null })} />);

    expect(screen.getByTestId("position-share")).toHaveTextContent("—");
  });

  it("formats XLM amount with two decimal places", () => {
    render(<PositionCard position={makePosition({ committed_amount: 1234.5 })} />);

    expect(screen.getByTestId("position-committed")).toHaveTextContent(
      "1,234.50 XLM committed"
    );
  });

  it("rounds share percentage to two decimal places in the UI", () => {
    render(<PositionCard position={makePosition({ share_percent: 12.345 })} />);

    expect(screen.getByTestId("position-share")).toHaveTextContent("12.35%");
  });

  it("renders Top Up button for active positions with remaining capacity", () => {
    render(
      <PositionCard
        position={makePosition({
          status: "active",
          remaining_capacity: 1000,
        })}
      />
    );

    expect(screen.getByTestId("top-up-button")).toBeInTheDocument();
  });

  it("does not render Top Up button for settled positions", () => {
    render(
      <PositionCard
        position={makePosition({
          status: "settled",
          remaining_capacity: 1000,
        })}
      />
    );

    expect(screen.queryByTestId("top-up-button")).not.toBeInTheDocument();
  });

  it("does not render Top Up button when remaining capacity is zero", () => {
    render(
      <PositionCard
        position={makePosition({
          status: "active",
          remaining_capacity: 0,
        })}
      />
    );

    expect(screen.queryByTestId("top-up-button")).not.toBeInTheDocument();
  });
});
