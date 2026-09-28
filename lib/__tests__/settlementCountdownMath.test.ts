import { describe, it, expect } from "vitest";

import {
  computeSettlementCountdown,
  formatCompactCountdown,
  formatFullCountdown,
  isOverdue,
  splitCountdown,
} from "@/lib/settlementCountdown";

const NOW = new Date("2026-06-01T12:00:00Z").getTime();
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

describe("computeSettlementCountdown", () => {
  it("splits the remaining time into days, hours, minutes and seconds", () => {
    const result = computeSettlementCountdown(
      new Date(NOW + (3 * DAY + 4 * HOUR + 5 * MINUTE + 6_000)).toISOString(),
      null,
      NOW
    );
    expect(result?.state).toBe("counting");
    expect(result?.parts).toMatchObject({
      days: 3,
      hours: 4,
      minutes: 5,
      seconds: 6,
    });
  });

  it("measures against the server timestamp, not a rounded day count", () => {
    // 23h 59m to go must read as 23:59:59, not 24:00:00 — a maturity a day
    // away is the case an old "days remaining" ceiling badge got wrong.
    const result = computeSettlementCountdown(
      new Date(NOW + DAY - 1000).toISOString(),
      null,
      NOW
    );
    expect(result?.parts).toMatchObject({ days: 0, hours: 23, minutes: 59, seconds: 59 });
  });

  it("stays consistent as the clock advances", () => {
    const maturity = new Date(NOW + 2 * DAY).toISOString();
    const first = computeSettlementCountdown(maturity, null, NOW);
    const later = computeSettlementCountdown(maturity, null, NOW + 2 * HOUR);
    expect(first?.parts.days).toBe(2);
    expect(later?.parts).toMatchObject({ days: 1, hours: 22 });
  });

  it("reports settled when a settlement date is present", () => {
    const result = computeSettlementCountdown(
      new Date(NOW + 30 * DAY).toISOString(),
      new Date(NOW - DAY).toISOString(),
      NOW
    );
    expect(result?.state).toBe("settled");
    expect(result?.daysOverdue).toBe(0);
  });

  it("lets an early settlement win over a maturity still in the future", () => {
    // Early repayment is a real flow here: once settled, counting down to the
    // original maturity would be actively misleading.
    const result = computeSettlementCountdown(
      new Date(NOW + 30 * DAY).toISOString(),
      new Date(NOW - HOUR).toISOString(),
      NOW
    );
    expect(result?.state).toBe("settled");
  });

  it("reports overdue once maturity has passed without settlement", () => {
    const result = computeSettlementCountdown(
      new Date(NOW - HOUR).toISOString(),
      null,
      NOW
    );
    expect(result?.state).toBe("overdue");
    expect(result?.daysOverdue).toBe(1);
  });

  it("counts whole days overdue", () => {
    const result = computeSettlementCountdown(
      new Date(NOW - (3 * DAY + 2 * HOUR)).toISOString(),
      null,
      NOW
    );
    expect(result?.state).toBe("overdue");
    expect(result?.daysOverdue).toBe(3);
  });

  it("reports 1 day overdue rather than 0 for a few hours past maturity", () => {
    const result = computeSettlementCountdown(
      new Date(NOW - 2 * HOUR).toISOString(),
      null,
      NOW
    );
    expect(result?.daysOverdue).toBe(1);
  });

  it("treats the exact maturity instant as overdue, not counting", () => {
    const result = computeSettlementCountdown(new Date(NOW).toISOString(), null, NOW);
    expect(result?.state).toBe("overdue");
  });

  it("returns null for a missing or unparseable maturity date", () => {
    expect(computeSettlementCountdown(null, null, NOW)).toBeNull();
    expect(computeSettlementCountdown(undefined, null, NOW)).toBeNull();
    expect(computeSettlementCountdown("not-a-date", null, NOW)).toBeNull();
  });

  it("still reports settled when the maturity date is unusable", () => {
    expect(computeSettlementCountdown(null, new Date(NOW).toISOString(), NOW)?.state).toBe(
      "settled"
    );
  });
});

describe("splitCountdown", () => {
  it("decomposes an exact second count", () => {
    expect(
      splitCountdown(3 * 86400 + 4 * 3600 + 5 * 60 + 6)
    ).toMatchObject({ days: 3, hours: 4, minutes: 5, seconds: 6 });
  });

  it("clamps a negative count to zero", () => {
    expect(splitCountdown(-500)).toMatchObject({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalSeconds: 0,
    });
  });

  it("floors a fractional second count", () => {
    expect(splitCountdown(10.9).seconds).toBe(10);
  });
});

describe("isOverdue", () => {
  it("is true past maturity with no settlement", () => {
    expect(isOverdue(new Date(NOW - DAY).toISOString(), null, NOW)).toBe(true);
  });

  it("is false before maturity", () => {
    expect(isOverdue(new Date(NOW + DAY).toISOString(), null, NOW)).toBe(false);
  });

  it("is false once settled, even past the original maturity", () => {
    expect(
      isOverdue(new Date(NOW - DAY).toISOString(), new Date(NOW).toISOString(), NOW)
    ).toBe(false);
  });
});

describe("countdown formatting", () => {
  const parts = { days: 7, hours: 4, minutes: 5, seconds: 9, totalSeconds: 0 };

  it("zero-pads the compact DD:HH:MM card form", () => {
    expect(formatCompactCountdown(parts)).toBe("07:04:05");
  });

  it("appends zero-padded seconds in the full detail form", () => {
    expect(formatFullCountdown(parts)).toBe("07:04:05:09");
  });

  it("renders the same digits in both forms apart from seconds", () => {
    expect(formatCompactCountdown(parts).slice(0, 8)).toBe(
      formatFullCountdown(parts).slice(0, 8)
    );
  });

  it("pads a zero-padded component correctly at each boundary", () => {
    expect(formatCompactCountdown({ ...parts, days: 0, hours: 0, minutes: 0 })).toBe(
      "00:00:00"
    );
  });
});
