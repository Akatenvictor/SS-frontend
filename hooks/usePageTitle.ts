"use client";

import { useEffect } from "react";

const BASE_TITLE = "StellarSettle";

export function usePageTitle(title: string | null | undefined) {
  useEffect(() => {
    if (title) {
      document.title = `${title} — ${BASE_TITLE}`;
    } else {
      document.title = BASE_TITLE;
    }

    return () => {
      document.title = BASE_TITLE;
    };
  }, [title]);
}
