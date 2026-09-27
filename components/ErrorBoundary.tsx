"use client";

import React from "react";
import { logError } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { GoToMarketplaceButton } from "@/components/layout/GoToMarketplaceButton";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Top-level React error boundary (#281).
 *
 * Wraps the whole app in the root layout and catches render errors thrown
 * outside of Next.js route transitions (e.g. inside providers or shared
 * components). The fallback offers a refresh action that resets the boundary
 * state and reloads the page.
 *
 * Note: Next.js `app/error.tsx` already handles router-level errors; this
 * boundary is the safety net for everything else rendered below the layout.
 */
export class AppErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
    this.handleRefresh = this.handleRefresh.bind(this);
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    logError("Unhandled render error caught by AppErrorBoundary", error);
  }

  handleRefresh(): void {
    this.setState({ hasError: false });
    window.location.reload();
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <main
          className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 py-8 text-center"
          data-testid="error-boundary-fallback"
        >
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="text-muted-foreground">
            An unexpected error occurred. You can refresh the page or head back
            to the marketplace.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button onClick={this.handleRefresh} data-testid="error-boundary-refresh">
              Refresh
            </Button>
            <GoToMarketplaceButton />
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
