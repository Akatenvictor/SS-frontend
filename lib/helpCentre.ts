/**
 * Help centre content (issue #323).
 *
 * Static FAQ articles grouped by audience category, plus pure helpers for
 * keyword filtering and the "Most viewed" section so both stay unit-testable
 * independently of the UI.
 */

export type HelpArticleCategory = "investors" | "sellers" | "platform" | "technical";

export interface HelpArticle {
  id: string;
  category: HelpArticleCategory;
  title: string;
  body: string;
  /** Cumulative view count used for the "Most viewed" section. */
  views: number;
}

export const HELP_CENTRE_CATEGORIES: HelpArticleCategory[] = [
  "investors",
  "sellers",
  "platform",
  "technical",
];

export const HELP_CENTRE_ARTICLES: HelpArticle[] = [
  {
    id: "invest-invoice",
    category: "investors",
    title: "How do I invest in an invoice?",
    body: "Open the marketplace, choose an open invoice and click Invest. Enter an amount above the protocol minimum and confirm the transaction with your connected wallet.",
    views: 420,
  },
  {
    id: "investor-returns",
    category: "investors",
    title: "When do I receive my returns?",
    body: "Returns are distributed pro-rata when the invoice settles. Claimed amounts appear in your payouts history on the investor dashboard.",
    views: 260,
  },
  {
    id: "seller-publish",
    category: "sellers",
    title: "How do I publish an invoice?",
    body: "Complete seller onboarding, then use Publish invoice to add the face value, funding deadline and supporting documents. The invoice goes live after review.",
    views: 510,
  },
  {
    id: "seller-rejected",
    category: "sellers",
    title: "What happens if my invoice is rejected?",
    body: "You receive a rejection reason in your notifications. You can edit the invoice and resubmit it for review at any time.",
    views: 180,
  },
  {
    id: "seller-deadline",
    category: "sellers",
    title: "Can I extend the funding deadline?",
    body: "Yes. From the invoice detail page, submit a deadline extension request before the current deadline expires. Extensions are recorded on the invoice timeline.",
    views: 140,
  },
  {
    id: "platform-wallet",
    category: "platform",
    title: "Which wallet can I use?",
    body: "StellarSettle supports the Freighter browser wallet on the Stellar network. Connect it from the nav bar to start transacting.",
    views: 300,
  },
  {
    id: "platform-fees",
    category: "platform",
    title: "What are the fees?",
    body: "A protocol fee is taken from each settled invoice. The remaining face value and yield are distributed to investors automatically.",
    views: 220,
  },
  {
    id: "platform-data",
    category: "platform",
    title: "How is my data stored?",
    body: "Invoice documents are stored on IPFS and addressed by content identifier, so they cannot be changed after upload.",
    views: 90,
  },
  {
    id: "technical-connect",
    category: "technical",
    title: "Why can't I connect my wallet?",
    body: "Make sure the Freighter extension is installed and unlocked, and that it allows the current site. Refresh the page after changing permissions.",
    views: 380,
  },
  {
    id: "technical-transaction",
    category: "technical",
    title: "Why is my transaction failing?",
    body: "Check that your wallet has enough XLM for the amount plus fees, and that you are connected to the network shown in the wallet chip.",
    views: 160,
  },
];

/** Filters articles by keyword in title and body, case-insensitively. */
export function filterHelpArticles(
  query: string,
  articles: HelpArticle[] = HELP_CENTRE_ARTICLES
): HelpArticle[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...articles];
  return articles.filter(
    (article) =>
      article.title.toLowerCase().includes(needle) ||
      article.body.toLowerCase().includes(needle)
  );
}

/** Returns the `limit` most viewed articles, highest view count first. */
export function getMostViewedArticles(
  limit: number = 5,
  articles: HelpArticle[] = HELP_CENTRE_ARTICLES
): HelpArticle[] {
  return [...articles].sort((a, b) => b.views - a.views).slice(0, limit);
}
