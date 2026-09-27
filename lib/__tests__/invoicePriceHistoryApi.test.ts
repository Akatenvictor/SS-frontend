import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { fetchInvoicePriceHistory } from "@/lib/api";

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

describe("fetchInvoicePriceHistory", () => {
  it("requests the price-history endpoint with the range query param", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ current_ask_price: 101, history: [] }));

    await fetchInvoicePriceHistory("inv-1", "30d");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(String(fetchMock.mock.calls[0][0]), "http://x");
    expect(url.pathname).toContain("/marketplace/invoices/inv-1/price-history");
    expect(url.searchParams.get("range")).toBe("30d");
  });

  it("normalizes history points and the current ask price", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        invoice_id: "inv-1",
        current_ask_price: 105,
        history: [
          { date: "2026-05-01T00:00:00Z", price: 100, quantity: 20 },
          { date: "2026-05-15T00:00:00Z", ask_price: 102, qty: 15 },
        ],
      })
    );

    const result = await fetchInvoicePriceHistory("inv-1");

    expect(result.invoice_id).toBe("inv-1");
    expect(result.current_ask_price).toBe(105);
    expect(result.history).toEqual([
      { date: "2026-05-01T00:00:00Z", price: 100, quantity: 20 },
      { date: "2026-05-15T00:00:00Z", price: 102, quantity: 15 },
    ]);
  });

  it("defaults current_ask_price to null when absent (invoice not currently listed)", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ history: [] }));

    const result = await fetchInvoicePriceHistory("inv-2");

    expect(result.current_ask_price).toBeNull();
  });

  it("accepts a bare array payload as the history list", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([{ date: "2026-05-01T00:00:00Z", price: 100, quantity: 5 }])
    );

    const result = await fetchInvoicePriceHistory("inv-3");

    expect(result.history).toHaveLength(1);
    expect(result.history[0].price).toBe(100);
  });

  it("throws when the response is not ok", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false, 500));

    await expect(fetchInvoicePriceHistory("inv-1")).rejects.toThrow(
      "Failed to fetch invoice price history"
    );
  });
});
