import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { extractApiErrorMessage, notifyApiError, API_ERROR_TOAST_DURATION_MS } from "../apiErrors";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

beforeEach(() => {
  vi.mocked(toast.error).mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("extractApiErrorMessage", () => {
  it("extracts the message from the standard API error envelope", () => {
    expect(extractApiErrorMessage({ error: { message: "Invoice not found" } })).toBe(
      "Invoice not found"
    );
  });

  it("extracts a top-level message field", () => {
    expect(extractApiErrorMessage({ message: "Validation failed" })).toBe(
      "Validation failed"
    );
  });

  it("extracts a plain string error field", () => {
    expect(extractApiErrorMessage({ error: "Unauthorized" })).toBe("Unauthorized");
  });

  it("extracts a detail field", () => {
    expect(extractApiErrorMessage({ detail: "Insufficient balance" })).toBe(
      "Insufficient balance"
    );
  });

  it("reads axios-style payloads nested under response.data", () => {
    expect(
      extractApiErrorMessage({
        response: { status: 422, data: { error: { message: "Amount too small" } } },
      })
    ).toBe("Amount too small");
  });

  it("falls back to the HTTP status when the payload has no message", () => {
    expect(extractApiErrorMessage({ response: { status: 500, data: {} } })).toBe(
      "Request failed with status 500"
    );
  });

  it("returns the message of a native Error", () => {
    expect(extractApiErrorMessage(new Error("Network failure"))).toBe("Network failure");
  });

  it("returns a generic fallback for unknown shapes", () => {
    expect(extractApiErrorMessage(undefined)).toBe(
      "Something went wrong. Please try again."
    );
    expect(extractApiErrorMessage(42)).toBe("Something went wrong. Please try again.");
  });

  it("ignores empty-string messages", () => {
    expect(extractApiErrorMessage({ message: "  " })).toBe(
      "Something went wrong. Please try again."
    );
  });
});

describe("notifyApiError", () => {
  it("shows a toast with the extracted message", () => {
    notifyApiError({ error: { message: "Invoice not found" } });

    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith("Invoice not found", {
      duration: API_ERROR_TOAST_DURATION_MS,
    });
  });

  it("auto-dismisses after 5 seconds", () => {
    notifyApiError(new Error("boom"));

    expect(API_ERROR_TOAST_DURATION_MS).toBe(5000);
    expect(vi.mocked(toast.error).mock.calls[0]?.[1]).toEqual({ duration: 5000 });
  });

  it("returns the extracted message", () => {
    expect(notifyApiError({ message: "Rate limited" })).toBe("Rate limited");
  });
});
