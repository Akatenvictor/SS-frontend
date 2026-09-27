import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  approveKeyPause,
  fetchAdminKeyControls,
  fetchWalletActivity,
} from "@/lib/api";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body } as unknown as Response;
}

describe("fetchAdminKeyControls", () => {
  it("derives pause_pending status from an open proposal", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        keys: [
          {
            key_id: "key-1",
            key_title: "Alice Key",
            pending_proposal: { proposed_by: "GADMINONE", proposed_at: "2026-01-01" },
          },
        ],
      })
    );

    const result = await fetchAdminKeyControls("jwt");

    expect(result.keys[0].tradingStatus).toBe("pause_pending");
    expect(result.keys[0].pendingProposal?.proposedBy).toBe("GADMINONE");
  });

  it("reports active status when there is no proposal", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ keys: [{ key_id: "key-1", title: "Alice Key" }] })
    );

    const result = await fetchAdminKeyControls("jwt");

    expect(result.keys[0].tradingStatus).toBe("active");
    expect(result.keys[0].pendingProposal).toBeNull();
  });
});

describe("approveKeyPause", () => {
  it("surfaces the server error when an admin approves their own proposal", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { message: "You cannot approve your own pause proposal" },
        false
      )
    );

    await expect(approveKeyPause("key-1", "jwt")).rejects.toThrow(
      "You cannot approve your own pause proposal"
    );
  });

  it("falls back to a generic error when the body has no message", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false));

    await expect(approveKeyPause("key-1", "jwt")).rejects.toThrow(
      "Failed to approve pause"
    );
  });
});

describe("fetchWalletActivity", () => {
  it("normalizes snake_case events and pagination metadata", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        events: [
          {
            id: "evt-1",
            event_type: "BURN",
            key_id: "key-1",
            key_name: "Alice Key",
            quantity: 3,
            created_at: "2026-01-01T00:00:00.000Z",
          },
        ],
        has_more: true,
        next_cursor: "cursor-2",
      })
    );

    const result = await fetchWalletActivity("GTEST", undefined, "jwt");

    expect(result.events[0]).toMatchObject({
      id: "evt-1",
      type: "burn",
      keyId: "key-1",
      keyName: "Alice Key",
      amount: 3,
    });
    expect(result.has_more).toBe(true);
    expect(result.next_cursor).toBe("cursor-2");
  });

  it("falls back to the transfer type for unknown event types", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([{ id: "evt-2", event_type: "mystery", amount: 1 }])
    );

    const result = await fetchWalletActivity("GTEST");

    expect(result.events[0].type).toBe("transfer");
  });
});
