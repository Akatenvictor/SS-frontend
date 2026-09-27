import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  buyFraction,
  fetchNotifications,
  fetchResaleListings,
  fetchUnreadCount,
  RESALE_INVOICE_TYPES,
} from "@/lib/api";

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchResaleListings", () => {
  it("requests the listings endpoint and normalises the payload", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        listings: [
          {
            id: "l-1",
            invoice_id: "inv-1",
            invoice_title: "Acme receivable",
            invoice_type: "trade_receivable",
            seller: "GSELLER",
            quantity: 100,
            remaining_quantity: 40,
            ask_price: 100,
            maturity_value: 110,
            maturity_date: "2027-01-01T00:00:00Z",
            listed_at: "2026-05-01T00:00:00Z",
            status: "active",
          },
        ],
        has_more: false,
        next_cursor: null,
      })
    );

    const result = await fetchResaleListings();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/marketplace/listings");
    expect(result.listings[0]).toMatchObject({
      id: "l-1",
      invoice_id: "inv-1",
      remaining_quantity: 40,
      ask_price: 100,
      status: "active",
    });
  });

  it("sends each filter as a query parameter", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ listings: [] }));

    await fetchResaleListings({
      invoiceType: "supply_chain",
      minYield: 5,
      maxYield: 20,
      minPrice: 10,
      maxPrice: 500,
      maxDaysToMaturity: 90,
    });

    const url = new URL(String(fetchMock.mock.calls[0][0]), "http://x");
    expect(url.searchParams.get("invoice_type")).toBe("supply_chain");
    expect(url.searchParams.get("min_yield")).toBe("5");
    expect(url.searchParams.get("max_yield")).toBe("20");
    expect(url.searchParams.get("min_price")).toBe("10");
    expect(url.searchParams.get("max_price")).toBe("500");
    expect(url.searchParams.get("max_days_to_maturity")).toBe("90");
  });

  it("omits the invoice type when it is 'all' and skips zero bounds", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ listings: [] }));

    await fetchResaleListings({ invoiceType: "all", minYield: 0, maxPrice: 0 });

    const url = new URL(String(fetchMock.mock.calls[0][0]), "http://x");
    expect(url.searchParams.get("invoice_type")).toBeNull();
    expect(url.searchParams.get("min_yield")).toBeNull();
    expect(url.searchParams.get("max_price")).toBeNull();
  });

  it("accepts the camelCase and alternate field names the API has shipped", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        listings: [
          {
            listing_id: "l-9",
            invoiceId: "inv-9",
            invoiceTitle: "Legacy payload",
            invoiceType: "equipment_lease",
            seller_address: "GOLD",
            shares: 50,
            shares_remaining: 12,
            askPrice: 55,
            face_value: 60,
            due_date: "2027-02-01T00:00:00Z",
            created_at: "2026-04-01T00:00:00Z",
          },
        ],
      })
    );

    const result = await fetchResaleListings();
    expect(result.listings[0]).toMatchObject({
      id: "l-9",
      invoice_id: "inv-9",
      invoice_title: "Legacy payload",
      invoice_type: "equipment_lease",
      seller: "GOLD",
      quantity: 50,
      remaining_quantity: 12,
      ask_price: 55,
      maturity_value: 60,
      status: "active",
    });
  });

  it("accepts a bare array response", async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ id: "l-1" }]));
    const result = await fetchResaleListings();
    expect(result.listings).toHaveLength(1);
    // remaining_quantity falls back to the total when not reported.
    expect(result.listings[0].remaining_quantity).toBe(0);
  });

  it("throws on a non-ok response", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false, 500));
    await expect(fetchResaleListings()).rejects.toThrow("Failed to fetch resale listings");
  });

  it("exposes the invoice types the filter offers", () => {
    expect(RESALE_INVOICE_TYPES).toContain("trade_receivable");
    expect(RESALE_INVOICE_TYPES).toContain("supply_chain");
  });
});

describe("buyFraction", () => {
  it("posts the quantity and returns the transaction hash", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ success: true, transaction_hash: "abc123", remaining_quantity: 0 })
    );

    const result = await buyFraction({ listingId: "l-1", quantity: 3 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/marketplace/listings/l-1/buy");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ quantity: 3 });
    expect(result).toEqual({ success: true, transaction_hash: "abc123", remaining_quantity: 0 });
  });

  it("surfaces the server error message when the purchase fails", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: "Not enough fractions available" }, false, 400)
    );

    await expect(buyFraction({ listingId: "l-1", quantity: 99 })).rejects.toThrow(
      "Not enough fractions available"
    );
  });

  it("falls back to a generic message when the body is unreadable", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("bad body");
      },
    } as unknown as Response);

    await expect(buyFraction({ listingId: "l-1", quantity: 1 })).rejects.toThrow(
      "Failed to buy fraction"
    );
  });
});

describe("fetchNotifications", () => {
  it("returns notifications newest first", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([
        { id: "old", read: false, created_at: "2026-01-01T00:00:00Z" },
        { id: "new", read: false, created_at: "2026-09-01T00:00:00Z" },
      ])
    );

    const result = await fetchNotifications();
    expect(result.map((n) => n.id)).toEqual(["new", "old"]);
  });

  it("unwraps a { notifications: [...] } envelope", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ notifications: [{ id: "n-1", is_read: true }] })
    );

    const result = await fetchNotifications();
    expect(result).toHaveLength(1);
    expect(result[0].read).toBe(true);
  });

  it("tolerates an unexpected payload shape", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ unexpected: true }));
    await expect(fetchNotifications()).resolves.toEqual([]);
  });
});

describe("fetchUnreadCount", () => {
  it("returns the count", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ count: 4 }));
    await expect(fetchUnreadCount()).resolves.toEqual({ count: 4 });
  });
});
