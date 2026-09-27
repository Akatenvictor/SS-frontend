import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { validateDeadline } from "../deadline";

describe("validateDeadline", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns error for empty string", () => {
    vi.setSystemTime(new Date("2026-08-25T12:00:00Z"));
    const result = validateDeadline("");
    expect(result).toBe("Funding deadline is required");
  });

  it("returns error for invalid date format", () => {
    vi.setSystemTime(new Date("2026-08-25T12:00:00Z"));
    const result = validateDeadline("invalid-date");
    expect(result).toBe("Invalid date format");
  });

  it("passes validation for deadline exactly 24 hours from now", () => {
    // Set current time to noon
    const now = new Date("2026-08-25T12:00:00Z");
    vi.setSystemTime(now);

    // Deadline is exactly 24 hours later (noon tomorrow)
    const result = validateDeadline("2026-08-26");
    expect(result).toBeUndefined();
  });

  it("fails validation for deadline 23 hours 59 minutes from now", () => {
    // Set current time to noon
    const now = new Date("2026-08-25T12:00:00Z");
    vi.setSystemTime(now);

    // Deadline is today (less than 24 hours from now)
    const result = validateDeadline("2026-08-25");
    expect(result).toBe("Deadline must be at least 24 hours from now");
  });

  it("fails validation for deadline in the past", () => {
    // Set current time to noon on Aug 25
    const now = new Date("2026-08-25T12:00:00Z");
    vi.setSystemTime(now);

    // Deadline is yesterday
    const result = validateDeadline("2026-08-24");
    expect(result).toBe("Deadline must be at least 24 hours from now");
  });

  it("passes validation for deadline 7 days in the future", () => {
    // Set current time to noon
    const now = new Date("2026-08-25T12:00:00Z");
    vi.setSystemTime(now);

    // Deadline is 7 days later
    const result = validateDeadline("2026-09-01");
    expect(result).toBeUndefined();
  });

  it("passes validation for deadline far in the future", () => {
    // Set current time
    const now = new Date("2026-08-25T12:00:00Z");
    vi.setSystemTime(now);

    // Deadline is 1 year later
    const result = validateDeadline("2027-08-25");
    expect(result).toBeUndefined();
  });

  it("passes validation for deadline at 23:59:59 on the 24th hour", () => {
    // Set current time to 11:59:59 AM
    const now = new Date("2026-08-25T11:59:59Z");
    vi.setSystemTime(now);

    // Deadline is tomorrow (more than 24 hours away)
    const result = validateDeadline("2026-08-26");
    expect(result).toBeUndefined();
  });

  it("fails validation when deadline is same day even at end of day", () => {
    // Set current time to beginning of day
    const now = new Date("2026-08-25T00:00:00Z");
    vi.setSystemTime(now);

    // Deadline is same day (less than 24 hours away)
    const result = validateDeadline("2026-08-25");
    expect(result).toBe("Deadline must be at least 24 hours from now");
  });

  it("passes validation for deadline at start of day + 24 hours", () => {
    // Set current time to midnight
    const now = new Date("2026-08-25T00:00:00Z");
    vi.setSystemTime(now);

    // Deadline is next day at midnight (24+ hours away)
    const result = validateDeadline("2026-08-26");
    expect(result).toBeUndefined();
  });

  it("returns error for malformed date string", () => {
    vi.setSystemTime(new Date("2026-08-25T12:00:00Z"));
    const result = validateDeadline("2026-13-45"); // Invalid month/day
    expect(result).toBe("Invalid date format");
  });

  it("returns undefined (valid) for boundary condition: exactly 24 hours later at end of day", () => {
    // Set current time to 4 PM
    const now = new Date("2026-08-25T16:00:00Z");
    vi.setSystemTime(now);

    // Deadline is tomorrow (guaranteed to be > 24 hours with end-of-day logic)
    const result = validateDeadline("2026-08-26");
    expect(result).toBeUndefined();
  });
});
