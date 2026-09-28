"use client";

import Link from "next/link";

/**
 * Site footer (#450).
 *
 * Carries the links that must be reachable from every page — most importantly
 * the public fee schedule, which investors are expected to be able to reach
 * from anywhere rather than only from the flow where a fee is charged.
 */
export function Footer() {
  return (
    <footer
      className="border-t bg-muted/30"
      data-testid="site-footer"
      aria-label="Site footer"
    >
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="font-semibold">StellarSettle</p>
            <p className="text-sm text-muted-foreground">
              Decentralized invoice financing on Stellar
            </p>
          </div>

          <nav aria-label="Footer">
            <ul className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm sm:grid-cols-3">
              <li>
                <Link
                  href="/marketplace"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Marketplace
                </Link>
              </li>
              <li>
                {/* #450 — the fee schedule is public and must be reachable
                    from the footer on every page. */}
                <Link
                  href="/fees"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  data-testid="footer-fees-link"
                >
                  Fee Schedule
                </Link>
              </li>
              <li>
                <Link
                  href="/help"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Help
                </Link>
              </li>
              <li>
                <Link
                  href="/marketplace/resale"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  Secondary Market
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Fees shown are the platform&apos;s current rates and can change. Always
          check the{" "}
          <Link href="/fees" className="underline underline-offset-2">
            fee schedule
          </Link>{" "}
          before investing.
        </p>
      </div>
    </footer>
  );
}
