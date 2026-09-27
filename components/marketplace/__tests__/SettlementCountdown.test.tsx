import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { SettlementCountdown } from "../SettlementCountdown";

const DAY = 24 * 60 * 60 * 1000;

function isoFromNow(offsetMs: number): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("counting state", () => {
  it("shows the days, hours and minutes left on a card", () => {
    render(
      <SettlementCountdown maturityDate={isoFromNow(3 * DAY + 4 * 60 * 60 * 1000 + 30 * 60 * 1000)} />
    );

    expect(screen.getByTestId("settlement-countdown-value")).toHaveTextContent(
      "03:04:30"
    );
  });

  it("adds seconds in the detail variant", () => {
    render(
      <SettlementCountdown
        maturityDate={isoFromNow(3 * DAY + 4 * 60 * 60 * 1000 + 30 * 60 * 1000 + 45_000)}
        variant="detail"
      />
    );

    expect(screen.getByTestId("settlement-countdown-value")).toHaveTextContent(
      "03:04:30:45"
    );
  });

  it("zero-pads every component", () => {
    render(
      <SettlementCountdown maturityDate={isoFromNow(2 * 60 * 1000 + 5000)} />
    );

    expect(screen.getByTestId("settlement-countdown-value")).toHaveTextContent(
      "00:00:02"
    );
  });

  it("counts against the server timestamp, not a rounded day count", () => {
    // 23h 59m out must read 00:23:59 — a naive ceil() would show a full day.
    render(<SettlementCountdown maturityDate={isoFromNow(DAY - 1000)} />);

    expect(screen.getByTestId("settlement-countdown-value")).toHaveTextContent(
      "00:23:59"
    );
  });

  it("announces the remaining time in words for screen readers", () => {
    render(
      <SettlementCountdown
        maturityDate={isoFromNow(2 * DAY + 3 * 60 * 60 * 1000)}
      />
    );

    expect(
      screen.getByText(/2 days, 3 hours and 0 minutes until settlement/)
    ).toBeInTheDocument();
  });

  it("marks itself as counting for styling and querying", () => {
    render(<SettlementCountdown maturityDate={isoFromNow(DAY)} />);
    expect(screen.getByTestId("settlement-countdown")).toHaveAttribute(
      "data-state",
      "counting"
    );
  });

  it("renders nothing when there is no maturity date", () => {
    const { container } = render(<SettlementCountdown maturityDate={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("settled state", () => {
  it("replaces the countdown with a settlement-complete badge", () => {
    render(
      <SettlementCountdown
        maturityDate={isoFromNow(10 * DAY)}
        settledAt={new Date().toISOString()}
      />
    );

    expect(screen.getByTestId("settlement-settled-badge")).toBeInTheDocument();
    expect(screen.queryByTestId("settlement-countdown")).not.toBeInTheDocument();
  });

  it("shows the settlement date on the badge", () => {
    const settledAt = new Date("2026-05-20T10:00:00Z").toISOString();
    render(<SettlementCountdown maturityDate={isoFromNow(DAY)} settledAt={settledAt} />);

    expect(screen.getByTestId("settlement-settled-badge")).toHaveTextContent(
      /20.*May|May.*20/
    );
  });

  it("stays settled even though the maturity date is still in the future", () => {
    // Early repayment is a real flow: once settled, counting down to the
    // original maturity would be actively misleading.
    render(
      <SettlementCountdown
        maturityDate={isoFromNow(30 * DAY)}
        settledAt={new Date().toISOString()}
      />
    );

    expect(screen.getByTestId("settlement-settled-badge")).toBeInTheDocument();
  });

  it("does not re-render on a tick once settled", () => {
    const settledAt = new Date().toISOString();
    const { rerender } = render(
      <SettlementCountdown maturityDate={isoFromNow(10 * DAY)} settledAt={settledAt} />
    );
    const badge = screen.getByTestId("settlement-settled-badge");

    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    rerender(
      <SettlementCountdown maturityDate={isoFromNow(10 * DAY)} settledAt={settledAt} />
    );

    expect(screen.getByTestId("settlement-settled-badge")).toBe(badge);
  });
});

describe("overdue state", () => {
  it("shows the overdue badge once maturity has passed", () => {
    render(<SettlementCountdown maturityDate={isoFromNow(-2 * 60 * 60 * 1000)} />);

    expect(screen.getByTestId("settlement-overdue-badge")).toBeInTheDocument();
    expect(screen.queryByTestId("settlement-countdown")).not.toBeInTheDocument();
  });

  it("counts whole days overdue", () => {
    render(<SettlementCountdown maturityDate={isoFromNow(-(3 * DAY + 2 * 60 * 60 * 1000))} />);

    expect(screen.getByTestId("settlement-overdue-badge")).toHaveTextContent(
      "3 days overdue"
    );
  });

  it("reads as a single day overdue when only hours have passed", () => {
    render(<SettlementCountdown maturityDate={isoFromNow(-5 * 60 * 60 * 1000)} />);

    expect(screen.getByTestId("settlement-overdue-badge")).toHaveTextContent(
      "1 day overdue"
    );
  });

  it("does not tick once overdue, waiting on the settlement to be recorded", () => {
    const { rerender } = render(
      <SettlementCountdown maturityDate={isoFromNow(-2 * DAY)} />
    );
    const badge = screen.getByTestId("settlement-overdue-badge");

    act(() => {
      vi.advanceTimersByTime(65_000);
    });
    rerender(<SettlementCountdown maturityDate={isoFromNow(-2 * DAY)} />);

    expect(screen.getByTestId("settlement-overdue-badge")).toBe(badge);
  });

  it("switches to settled when the settlement lands after the fact", () => {
    const maturityDate = isoFromNow(-2 * DAY);
    const { rerender } = render(<SettlementCountdown maturityDate={maturityDate} />);
    expect(screen.getByTestId("settlement-overdue-badge")).toBeInTheDocument();

    rerender(
      <SettlementCountdown maturityDate={maturityDate} settledAt={new Date().toISOString()} />
    );

    expect(screen.getByTestId("settlement-settled-badge")).toBeInTheDocument();
    expect(screen.queryByTestId("settlement-overdue-badge")).not.toBeInTheDocument();
  });
});

describe("ticking", () => {
  it("advances the card countdown as time passes", () => {
    render(<SettlementCountdown maturityDate={isoFromNow(DAY)} />);
    expect(screen.getByTestId("settlement-countdown-value")).toHaveTextContent("01:00:00");

    // 1d 0h 0m less 1h 30m is 22h 30m — the day field drops to 0.
    act(() => {
      vi.advanceTimersByTime(90 * 60 * 1000);
    });

    expect(screen.getByTestId("settlement-countdown-value")).toHaveTextContent("00:22:30");
  });

  it("advances the detail countdown second by second", () => {
    render(
      <SettlementCountdown maturityDate={isoFromNow(DAY)} variant="detail" />
    );
    // DD:HH:MM:SS is a duration, not a date: one day out is 1d 00h 00m 00s.
    expect(screen.getByTestId("settlement-countdown-value")).toHaveTextContent(
      "01:00:00:00"
    );

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    // A day less one second is 0d 23h 59m 59s.
    expect(screen.getByTestId("settlement-countdown-value")).toHaveTextContent(
      "00:23:59:59"
    );
  });

  it("rolls the detail countdown to 00:00:00:00 and then into overdue", () => {
    render(
      <SettlementCountdown maturityDate={isoFromNow(2_000)} variant="detail" />
    );
    expect(screen.getByTestId("settlement-countdown-value")).toHaveTextContent(
      "00:00:00:02"
    );

    // Stepped rather than one large jump: the detail variant re-arms its tick
    // from inside the previous tick, so each advance flushes exactly one more.
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByTestId("settlement-countdown-value")).toHaveTextContent(
      "00:00:00:01"
    );

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByTestId("settlement-overdue-badge")).toBeInTheDocument();
    expect(screen.queryByTestId("settlement-countdown")).not.toBeInTheDocument();
  });
});

describe("consistency between surfaces", () => {
  it("renders the same digits for the same maturity on card and detail", () => {
    const maturityDate = isoFromNow(2 * DAY + 5 * 60 * 60 * 1000 + 10 * 60 * 1000 + 20_000);

    const card = render(<SettlementCountdown maturityDate={maturityDate} />);
    const cardValue = screen.getByTestId("settlement-countdown-value").textContent;
    card.unmount();

    render(
      <SettlementCountdown maturityDate={maturityDate} variant="detail" />
    );
    const detailValue = screen.getByTestId("settlement-countdown-value").textContent;

    // The detail form is the card form plus a seconds field, so the two must
    // agree on everything up to that point.
    expect(detailValue).toBe(`${cardValue}:20`);
  });
});
