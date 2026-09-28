import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { AppErrorBoundary } from "@/components/ErrorBoundary";
import { Navbar, Footer } from "@/components/layout";
import { MobileNav } from "@/components/layout/MobileNav";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
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
        <TooltipProvider>
          <Providers>
            <Navbar />
            {children}
            <Toaster />
          </Providers>
        </TooltipProvider>
      </body>
    </html>
  );
}
