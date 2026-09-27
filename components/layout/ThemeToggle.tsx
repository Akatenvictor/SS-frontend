"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

/**
 * Manual dark mode toggle (issue #321).
 *
 * The system preference is applied by the ThemeProvider on first load; this
 * button overrides it immediately. The icon is rendered only after mount to
 * avoid a hydration mismatch, since the resolved theme is only known on the
 * client.
 */
export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <span aria-hidden="true" className="h-5 w-5" />;
  }

  return (
    <button
      type="button"
      aria-label="Toggle dark mode"
      data-testid="theme-toggle"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="rounded-md p-1 hover:bg-muted/50"
    >
      {resolvedTheme === "dark" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
}
