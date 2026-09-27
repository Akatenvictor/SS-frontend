import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { AppErrorBoundary } from "@/components/ErrorBoundary";
import { Navbar, Footer } from "@/components/layout";
import { MobileNav } from "@/components/layout/MobileNav";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "StellarSettle",
  description: "Modern web interface for decentralized invoice financing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <Navbar />
          <MobileNav />
          {/* #281 — top-level boundary catching render errors below the layout */}
          <AppErrorBoundary>
            {children}
          </AppErrorBoundary>
          <Toaster />
          {/* #450 — site-wide footer, carries the public fee schedule link.
              Rendered at every breakpoint: the fee schedule has to stay
              reachable on mobile, where the tab bar is the only other nav. */}
          <Footer />
          {/* Bottom padding for mobile tab bar */}
          <div className="h-14 md:hidden" />
        </Providers>
      </body>
    </html>
  );
}
