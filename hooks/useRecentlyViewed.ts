"use client";

import { useEffect, useState } from "react";
import { getRecentViews, type RecentlyViewedInvoice } from "@/lib/recentlyViewed";

export function useRecentlyViewed() {
  const [entries, setEntries] = useState<RecentlyViewedInvoice[]>([]);

  useEffect(() => {
    setEntries(getRecentViews());
  }, []);

  return { entries };
}
