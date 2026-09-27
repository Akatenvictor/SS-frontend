import { describe, it, expect } from "vitest";
import {
  filterHelpArticles,
  getMostViewedArticles,
  HELP_CENTRE_ARTICLES,
  HELP_CENTRE_CATEGORIES,
} from "@/lib/helpCentre";

describe("helpCentre", () => {
  describe("filterHelpArticles", () => {
    it("returns every article for an empty query", () => {
      expect(filterHelpArticles("")).toEqual(HELP_CENTRE_ARTICLES);
      expect(filterHelpArticles("   ")).toEqual(HELP_CENTRE_ARTICLES);
    });

    it("matches articles by keyword in the title, case-insensitively", () => {
      const results = filterHelpArticles("INVEST IN AN INVOICE");

      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe("invest-invoice");
    });

    it("matches articles by keyword in the body", () => {
      const results = filterHelpArticles("pro-rata");

      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe("investor-returns");
    });

    it("returns multiple matches across categories", () => {
      const results = filterHelpArticles("wallet");

      expect(results.map((article) => article.id)).toEqual([
        "platform-wallet",
        "technical-connect",
        "technical-transaction",
      ]);
    });

    it("returns nothing for an unknown keyword", () => {
      expect(filterHelpArticles("blockchain quantum")).toEqual([]);
    });
  });

  describe("getMostViewedArticles", () => {
    it("returns the top 5 articles by view count by default", () => {
      const results = getMostViewedArticles();

      expect(results.map((article) => article.id)).toEqual([
        "seller-publish",
        "invest-invoice",
        "technical-connect",
        "platform-wallet",
        "investor-returns",
      ]);
    });

    it("respects a custom limit", () => {
      expect(getMostViewedArticles(2)).toHaveLength(2);
      expect(getMostViewedArticles(2).map((article) => article.views)).toEqual([510, 420]);
    });

    it("caps the result at the number of available articles", () => {
      expect(getMostViewedArticles(99)).toHaveLength(HELP_CENTRE_ARTICLES.length);
    });
  });

  it("defines exactly the four supported categories", () => {
    expect(HELP_CENTRE_CATEGORIES).toEqual(["investors", "sellers", "platform", "technical"]);
  });
});
