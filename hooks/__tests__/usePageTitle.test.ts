import { describe, it, expect, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePageTitle } from "../usePageTitle";

describe("usePageTitle", () => {
  afterEach(() => {
    document.title = "StellarSettle";
  });

  it("sets the document title with base suffix", () => {
    renderHook(() => usePageTitle("Browse Invoices"));

    expect(document.title).toBe("Browse Invoices — StellarSettle");
  });

  it("resets title to base on unmount", () => {
    const { unmount } = renderHook(() => usePageTitle("My Dashboard"));

    expect(document.title).toBe("My Dashboard — StellarSettle");

    unmount();

    expect(document.title).toBe("StellarSettle");
  });

  it("sets base title when title is null", () => {
    renderHook(() => usePageTitle(null));

    expect(document.title).toBe("StellarSettle");
  });

  it("sets base title when title is undefined", () => {
    renderHook(() => usePageTitle(undefined));

    expect(document.title).toBe("StellarSettle");
  });

  it("updates title when prop changes", () => {
    const { rerender } = renderHook(
      ({ title }) => usePageTitle(title),
      { initialProps: { title: "Page A" as string | null } }
    );

    expect(document.title).toBe("Page A — StellarSettle");

    rerender({ title: "Page B" });

    expect(document.title).toBe("Page B — StellarSettle");
  });
});
