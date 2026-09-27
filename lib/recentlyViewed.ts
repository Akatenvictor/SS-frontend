const STORAGE_KEY = "recently_viewed";
const MAX_ENTRIES = 5;
const STALE_DAYS = 7;

export interface RecentlyViewedInvoice {
  id: string;
  title: string;
  status: string;
  amount: number;
  viewedAt: string;
}

function getEntries(): RecentlyViewedInvoice[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentlyViewedInvoice[];
  } catch {
    return [];
  }
}

export function recordView(invoice: Omit<RecentlyViewedInvoice, "viewedAt">) {
  try {
    const all = getEntries();
    const filtered = all.filter((e) => e.id !== invoice.id);
    const updated: RecentlyViewedInvoice[] = [
      { ...invoice, viewedAt: new Date().toISOString() },
      ...filtered,
    ].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage unavailable
  }
}

export function getRecentViews(): RecentlyViewedInvoice[] {
  try {
    const all = getEntries();
    const cutoff = Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000;
    const fresh = all.filter((e) => new Date(e.viewedAt).getTime() > cutoff);
    if (fresh.length < all.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    }
    return fresh.slice(0, 3);
  } catch {
    return [];
  }
}
