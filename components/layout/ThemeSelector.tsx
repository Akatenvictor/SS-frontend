"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

const OPTIONS = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

/**
 * Appearance setting (issue #386).
 *
 * Unlike the nav bar ThemeToggle (a quick light/dark flip), this exposes the
 * stored preference itself, including "System" so a user who overrode the
 * OS setting can go back to following it. next-themes persists the choice in
 * localStorage and syncs it across tabs via the `storage` event.
 */
export function ThemeSelector() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  // The stored theme is only known on the client; avoid a hydration mismatch.
  const current = mounted ? (theme ?? "system") : undefined;

  return (
    <fieldset className="space-y-2" data-testid="theme-selector">
      <legend className="text-sm font-medium">Appearance</legend>
      <div role="radiogroup" aria-label="Theme" className="inline-flex rounded-md border p-1">
        {OPTIONS.map(({ value, label, Icon }) => {
          const selected = current === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setTheme(value)}
              className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm transition-colors ${
                selected
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
