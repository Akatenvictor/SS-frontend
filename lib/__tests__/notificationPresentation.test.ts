import { describe, it, expect } from "vitest";

import {
  getNotificationIcon,
  getNotificationPresentation,
  getNotificationTitle,
  resolveNotificationCategory,
  resolveNotificationRoute,
} from "@/lib/notifications";
import {
  normalizeNotification,
  sortNotificationsByRecency,
  type NotificationItem,
} from "@/lib/api";

function item(overrides: Partial<NotificationItem> = {}): NotificationItem {
  return { id: "n-1", read: false, ...overrides };
}

describe("resolveNotificationCategory", () => {
  it("maps settlement events", () => {
    for (const type of ["settlement", "invoice_settled", "invoice_matured", "payout"]) {
      expect(resolveNotificationCategory(type)).toBe("settlement");
    }
  });

  it("maps KYC events", () => {
    for (const type of ["kyc_approved", "kyc_rejected", "kyc_status", "identity_verified"]) {
      expect(resolveNotificationCategory(type)).toBe("kyc");
    }
  });

  it("maps secondary-market sale events", () => {
    for (const type of ["listing_sold", "fraction_sold", "resale_sold"]) {
      expect(resolveNotificationCategory(type)).toBe("listing");
    }
  });

  it("maps invoice approval and rejection events", () => {
    expect(resolveNotificationCategory("invoice_approved")).toBe("invoice");
    expect(resolveNotificationCategory("invoice_rejected")).toBe("invoice");
  });

  it("falls back to general for missing or unknown types", () => {
    expect(resolveNotificationCategory(undefined)).toBe("general");
    expect(resolveNotificationCategory("something_new")).toBe("general");
  });

  it("is case-insensitive", () => {
    expect(resolveNotificationCategory("SETTLEMENT")).toBe("settlement");
  });
});

describe("notification copy and icons", () => {
  it("gives every category a label and a distinct icon", () => {
    const categories = ["settlement", "kyc", "listing", "invoice", "general"] as const;
    const icons = categories.map((c) => getNotificationPresentation({ type: c }).icon);
    const labels = categories.map((c) => getNotificationPresentation({ type: c }).label);

    expect(new Set(icons).size).toBe(categories.length);
    labels.forEach((label) => expect(label).toBeTruthy());
  });

  it("uses a cross for rejections so they are not mistaken for approvals", () => {
    expect(getNotificationIcon("invoice_rejected")).not.toBe(getNotificationIcon("invoice_approved"));
    expect(getNotificationIcon("kyc_rejected")).not.toBe(getNotificationIcon("kyc_approved"));
  });

  it("prefers title, then message, then category copy", () => {
    expect(getNotificationTitle(item({ title: "Paid out" }))).toBe("Paid out");
    expect(getNotificationTitle(item({ message: "Settled" }))).toBe("Settled");
    expect(getNotificationTitle(item({ type: "settlement" }))).toBe("Settlement processed");
    expect(getNotificationTitle(item({}))).toBe("New notification");
  });
});

describe("resolveNotificationRoute", () => {
  it("prefers an explicit link over anything else", () => {
    const route = resolveNotificationRoute(
      item({ link: "/marketplace/inv-9", type: "settlement", invoice_id: "inv-1" })
    );
    expect(route).toBe("/marketplace/inv-9");
  });

  it("routes a settlement to the investor dashboard", () => {
    expect(resolveNotificationRoute(item({ type: "settlement" }))).toBe("/investor");
  });

  it("routes KYC status changes to the KYC status page", () => {
    expect(resolveNotificationRoute(item({ type: "kyc_approved" }))).toBe("/kyc/status");
    expect(resolveNotificationRoute(item({ type: "kyc_rejected" }))).toBe("/kyc/status");
  });

  it("routes a secondary-market sale to the resale market", () => {
    expect(resolveNotificationRoute(item({ type: "listing_sold" }))).toBe("/marketplace/resale");
  });

  it("routes an approval or rejection to the invoice it concerns", () => {
    expect(resolveNotificationRoute(item({ type: "invoice_rejected", invoice_id: "inv-7" }))).toBe(
      "/marketplace/inv-7"
    );
    expect(resolveNotificationRoute(item({ type: "invoice_approved", invoice_id: "inv-8" }))).toBe(
      "/marketplace/inv-8"
    );
  });

  it("falls back to the marketplace for an invoice notice with no invoice id", () => {
    expect(resolveNotificationRoute(item({ type: "invoice_approved" }))).toBe("/marketplace");
  });

  it("returns null for a general notification with nowhere to go", () => {
    expect(resolveNotificationRoute(item({}))).toBeNull();
    expect(resolveNotificationRoute(item({ type: "unmapped_event" }))).toBeNull();
  });
});

describe("normalizeNotification", () => {
  it("maps the snake_case and camelCase variants the API has shipped", () => {
    const normalized = normalizeNotification({
      id: "n-1",
      event_type: "listing_sold",
      is_read: true,
      createdAt: "2026-09-01T00:00:00Z",
      invoiceId: "inv-3",
      description: "body text",
      url: "/somewhere",
    });

    expect(normalized).toMatchObject({
      id: "n-1",
      type: "listing_sold",
      read: true,
      created_at: "2026-09-01T00:00:00Z",
      invoice_id: "inv-3",
      body: "body text",
      link: "/somewhere",
    });
  });

  it("defaults read to false and tolerates a missing id", () => {
    expect(normalizeNotification({}).read).toBe(false);
  });
});

describe("sortNotificationsByRecency", () => {
  it("returns newest first", () => {
    const sorted = sortNotificationsByRecency([
      item({ id: "old", created_at: "2026-01-01T00:00:00Z" }),
      item({ id: "new", created_at: "2026-09-01T00:00:00Z" }),
      item({ id: "mid", created_at: "2026-05-01T00:00:00Z" }),
    ]);
    expect(sorted.map((n) => n.id)).toEqual(["new", "mid", "old"]);
  });

  it("sorts undated notifications last rather than first", () => {
    const sorted = sortNotificationsByRecency([
      item({ id: "undated" }),
      item({ id: "dated", created_at: "2026-01-01T00:00:00Z" }),
    ]);
    expect(sorted.map((n) => n.id)).toEqual(["dated", "undated"]);
  });

  it("does not mutate the input array", () => {
    const input = [
      item({ id: "a", created_at: "2026-01-01T00:00:00Z" }),
      item({ id: "b", created_at: "2026-09-01T00:00:00Z" }),
    ];
    sortNotificationsByRecency(input);
    expect(input.map((n) => n.id)).toEqual(["a", "b"]);
  });
});
