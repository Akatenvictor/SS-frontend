import { toast } from "sonner";

/**
 * Global API error notification helpers (#281).
 *
 * Every mutation error across the app is surfaced through `notifyApiError`,
 * which extracts a human-readable message from the API response envelope and
 * shows a toast that auto-dismisses after 5 seconds.
 */

/** How long API error toasts stay on screen before auto-dismissing. */
export const API_ERROR_TOAST_DURATION_MS = 5000;

interface ApiErrorEnvelope {
  message?: unknown;
  error?: unknown;
  detail?: unknown;
  status?: unknown;
  statusText?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readMessage(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value;
  if (isRecord(value)) {
    if (typeof value.message === "string" && value.message.trim().length > 0) {
      return value.message;
    }
  }
  return null;
}

/**
 * Extracts a consistent error message from the API response envelope.
 *
 * Supports the shapes returned by the API (`{ error: { message } }`,
 * `{ message }`, `{ detail }`) as well as `Error` instances, axios-style
 * `response.data` payloads, and unknown values.
 */
export function extractApiErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;

  let envelope: ApiErrorEnvelope | null = null;
  if (isRecord(error)) {
    // axios-style errors carry the payload on `response.data`
    const data = isRecord(error.response) ? error.response.data : null;
    envelope = (data ?? error) as ApiErrorEnvelope;
  }

  if (envelope) {
    const direct =
      readMessage(envelope.message) ??
      readMessage(envelope.error) ??
      readMessage(envelope.detail);
    if (direct) return direct;

    if (typeof envelope.status === "number") {
      return `Request failed with status ${envelope.status}`;
    }
    if (typeof envelope.statusText === "string" && envelope.statusText) {
      return envelope.statusText;
    }
  }

  return "Something went wrong. Please try again.";
}

/**
 * Shows an API error toast that auto-dismisses after 5 seconds.
 *
 * Used as the global mutation `onError` callback so API failures surface
 * consistently without each screen handling toasts itself.
 */
export function notifyApiError(error: unknown): string {
  const message = extractApiErrorMessage(error);
  toast.error(message, { duration: API_ERROR_TOAST_DURATION_MS });
  return message;
}
