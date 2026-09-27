import { describe, it, expect } from "vitest";

import {
  MIN_VELOCITY_WINDOW_MS,
  STEADY_THRESHOLD_PCT,
  TRENDING_THRESHOLD_PCT,
  hasFullVelocityWindow,
  velocityClassName,
  velocityLabel,
  velocityPercent,
  velocityState,
} from "@/lib/fundingVelocity";

const NOW = new Date("2026-06-02T00:00:00Z").getTime();
const DAY = 24 * 60 * 60 * 1000;

/** Funded well over a day ago, so the velocity window is satisfied. */
const FUNDED_AT = new Date(NOW - 5 * DAY).toISOString();

describe("thresholds match the brief", () => {
  it("reads trending at >10% and steady at 1–10% in 24h", () => {
    expect(TRENDING_THRESHOLD_PCT).toBe(10);
    expect(STEADY_THRESHOLD_PCT).toBe(1);
    expect(MIN_VELOCITY_WINDOW_MS).toBe(DAY);
  });
});

describe("velocityPercent", () => {
  it("is the share of total raised committed in the last day", () => {
    expect(velocityPercent({ raisedLast24h: 2500, raised: 10000 })).toBe(25);
    expect(velocityPercent({ raisedLast24h: 1000, raised: 10000 })).toBe(10);
  });

  it("is 0 for an invoice that has raised nothing", () => {
    expect(velocityPercent({ raisedLast24h: 0, raised: 0 })).toBe(0);
    expect(velocityPercent({ raisedLast24h: 500, raised: 0 })).toBe(0);
  });

  it("is 0 rather than NaN or negative for nonsense figures", () => {
    expect(velocityPercent({ raisedLast24h: 100, raised: Number.NaN })).toBe(0);
    expect(velocityPercent({ raisedLast24h: Number.NaN, raised: 100 })).toBe(0);
    expect(velocityPercent({ raisedLast24h: -50, raised: 100 })).toBe(0);
  });
});

describe("hasFullVelocityWindow", () => {
  it("is true once the invoice has been funded for over 24h", () => {
    expect(hasFullVelocityWindow({ fundedAt: FUNDED_AT }, NOW)).toBe(true);
  });

  it("is true at exactly 24h — the boundary counts as a full window", () => {
    expect(
      hasFullVelocityWindow({ fundedAt: new Date(NOW - DAY).toISOString() }, NOW)
    ).toBe(true);
  });

  it("is false for an invoice funded less than 24h ago", () => {
    expect(
      hasFullVelocityWindow({ fundedAt: new Date(NOW - DAY + 1000).toISOString() }, NOW)
    ).toBe(false);
  });

  it("is false for a still-open invoice, which has no funding date", () => {
    expect(hasFullVelocityWindow({ fundedAt: null }, NOW)).toBe(false);
    expect(hasFullVelocityWindow({ fundedAt: undefined }, NOW)).toBe(false);
  });

  it("is false for an unparseable funding date", () => {
    expect(hasFullVelocityWindow({ fundedAt: "not-a-date" }, NOW)).toBe(false);
  });
});

describe("velocityState", () => {
  it("is hidden for an invoice funded less than 24h ago", () => {
    expect(
      velocityState(
        {
          raisedLast24h: 9000,
          raised: 10000,
          fundedAt: new Date(NOW - 60 * 60 * 1000).toISOString(),
        },
        NOW
      )
    ).toBeNull();
  });

  it("is hidden for a still-open invoice however fast it is filling", () => {
    expect(
      velocityState({ raisedLast24h: 9000, raised: 10000, fundedAt: null }, NOW)
    ).toBeNull();
  });

  it("is trending above 10% in 24h", () => {
    expect(
      velocityState({ raisedLast24h: 1100, raised: 10000, fundedAt: FUNDED_AT }, NOW)
    ).toBe("trending");
  });

  it("is trending exactly at the 10% boundary", () => {
    expect(
      velocityState({ raisedLast24h: 1000, raised: 10000, fundedAt: FUNDED_AT }, NOW)
    ).toBe("trending");
  });

  it("is steady just under the 10% boundary", () => {
    expect(
      velocityState({ raisedLast24h: 999, raised: 10000, fundedAt: FUNDED_AT }, NOW)
    ).toBe("steady");
  });

  it("is steady from 1% up to 10%", () => {
    expect(
      velocityState({ raisedLast24h: 100, raised: 10000, fundedAt: FUNDED_AT }, NOW)
    ).toBe("steady");
  });

  it("is steady exactly at the 1% boundary", () => {
    expect(
      velocityState({ raisedLast24h: 10, raised: 1000, fundedAt: FUNDED_AT }, NOW)
    ).toBe("steady");
  });

  it("is slow just under the 1% boundary", () => {
    expect(
      velocityState({ raisedLast24h: 9, raised: 1000, fundedAt: FUNDED_AT }, NOW)
    ).toBe("slow");
  });

  it("is slow when nothing arrived in the last day", () => {
    expect(
      velocityState({ raisedLast24h: 0, raised: 10000, fundedAt: FUNDED_AT }, NOW)
    ).toBe("slow");
  });
});

describe("velocity presentation", () => {
  it("labels all three states", () => {
    expect(velocityLabel("trending")).toBe("Trending");
    expect(velocityLabel("steady")).toBe("Steady");
    expect(velocityLabel("slow")).toBe("Slow");
  });

  it("colour-codes trending green, steady amber and slow grey", () => {
    expect(velocityClassName("trending")).toContain("green");
    expect(velocityClassName("steady")).toContain("amber");
    expect(velocityClassName("slow")).toContain("muted");
  });

  it("gives each state a distinct colour", () => {
    const classes = new Set([
      velocityClassName("trending"),
      velocityClassName("steady"),
      velocityClassName("slow"),
    ]);
    expect(classes.size).toBe(3);
  });

  it("pairs a light and dark-mode colour for the tinted states", () => {
    for (const state of ["trending", "steady"] as const) {
      expect(velocityClassName(state)).toContain("dark:");
    }
  });

  it("gives the slow state theme tokens, which adapt to dark mode on their own", () => {
    // No `dark:` override: --muted and --muted-foreground are redefined in
    // globals.css for dark mode, so a hard-coded variant here would fight the
    // theme rather than follow it.
    expect(velocityClassName("slow")).toContain("muted");
    expect(velocityClassName("slow")).not.toContain("dark:");
  });
});
