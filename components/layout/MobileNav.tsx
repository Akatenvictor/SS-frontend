"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Briefcase, Bell, User, Menu, X, Eye } from "lucide-react";
import { useState } from "react";
import { useUnreadCount } from "@/hooks/useNotifications";
import { useStellarWallet } from "@/hooks/useStellarWallet";

const TABS = [
  { href: "/marketplace", label: "Marketplace", icon: Home },
  { href: "/investor/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/investor/notifications", label: "Notifications", icon: Bell },
  { href: "/profile", label: "Profile", icon: User },
] as const;

const SECONDARY_LINKS = [
  { href: "/marketplace/resale", label: "Secondary market" },
  { href: "/investor/watchlist", label: "Watchlist" },
  { href: "/investor/keys", label: "Keys" },
  { href: "/kyc", label: "KYC" },
] as const;

export function MobileNav() {
  const pathname = usePathname();
  const { data: unreadData } = useUnreadCount();
  const { isConnected } = useStellarWallet();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const unreadCount = typeof unreadData === "number" ? unreadData : unreadData?.count ?? 0;

  if (!isConnected) return null;

  return (
    <>
      {/* Hamburger button - visible on mobile only */}
      <button
        className="fixed top-3 left-3 z-50 flex h-10 w-10 items-center justify-center rounded-lg border bg-background/95 backdrop-blur md:hidden"
        onClick={() => setDrawerOpen(!drawerOpen)}
        aria-label="Toggle menu"
        data-testid="mobile-menu-toggle"
      >
        {drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Slide-in drawer for secondary links */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute top-0 left-0 h-full w-64 bg-background border-r p-4 pt-16 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              More
            </p>
            {SECONDARY_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                onClick={() => setDrawerOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        data-testid="mobile-tab-bar"
      >
        <div className="flex items-center justify-around h-14">
          {TABS.map((tab) => {
            const isActive =
              tab.href === "/marketplace"
                ? pathname.startsWith("/marketplace")
                : pathname.startsWith(tab.href);
            const Icon = tab.icon;
            const showBadge = tab.href === "/investor/notifications" && unreadCount > 0;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`mobile-tab-${tab.label.toLowerCase()}`}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive px-0.5 text-[8px] font-bold text-destructive-foreground">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </div>
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
