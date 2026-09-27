import { describe, it, expect, beforeEach, vi } from "vitest";
import { recordView, getRecentViews } from "../recentlyViewed";

beforeEach(() => {
  localStorage.clear();
});

describe("recordView", () => {
  it("stores a new invoice view", () => {
    recordView({ id: "1", title: "Inv 1", status: "open", amount: 1000 });
    const views = getRecentViews();
    expect(views).toHaveLength(1);
    expect(views[0].title).toBe("Inv 1");
  });

  it("stores newest first", () => {
    recordView({ id: "1", title: "First", status: "open", amount: 1000 });
    recordView({ id: "2", title: "Second", status: "open", amount: 2000 });
    const views = getRecentViews();
    expect(views[0].title).toBe("Second");
    expect(views[1].title).toBe("First");
  });

  it("moves an existing entry to the top on re-view", () => {
    recordView({ id: "1", title: "First", status: "open", amount: 1000 });
    recordView({ id: "2", title: "Second", status: "open", amount: 2000 });
    recordView({ id: "1", title: "First", status: "funded", amount: 1000 });
    const views = getRecentViews();
    expect(views).toHaveLength(2);
    expect(views[0].id).toBe("1");
  });

  it("caps at 5 entries", () => {
    for (let i = 1; i <= 6; i++) {
      recordView({ id: String(i), title: `Inv ${i}`, status: "open", amount: i * 100 });
    }
    const views = getRecentViews();
    expect(views).toHaveLength(3);
  });

  it("handles localStorage being unavailable", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("localStorage unavailable");
    });
    expect(() => recordView({ id: "1", title: "Inv", status: "open", amount: 100 })).not.toThrow();
    setItem.mockRestore();
  });
});

describe("getRecentViews", () => {
  it("returns up to 3 most recent entries", () => {
    for (let i = 1; i <= 4; i++) {
      recordView({ id: String(i), title: `Inv ${i}`, status: "open", amount: i * 100 });
    }
    const views = getRecentViews();
    expect(views).toHaveLength(3);
  });

  it("removes entries older than 7 days", () => {
    const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const freshDate = new Date().toISOString();
    localStorage.setItem(
      "recently_viewed",
      JSON.stringify([
        { id: "1", title: "Old", status: "open", amount: 100, viewedAt: oldDate },
        { id: "2", title: "Fresh", status: "open", amount: 200, viewedAt: freshDate },
      ]),
    );
    const views = getRecentViews();
    expect(views).toHaveLength(1);
    expect(views[0].title).toBe("Fresh");
  });

  it("returns empty array when localStorage is empty", () => {
    const views = getRecentViews();
    expect(views).toEqual([]);
  });

  it("handles localStorage being unavailable", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("localStorage unavailable");
    });
    const views = getRecentViews();
    expect(views).toEqual([]);
    getItem.mockRestore();
  });
});
