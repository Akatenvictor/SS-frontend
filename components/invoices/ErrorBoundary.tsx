"use client";

import React, { Component, type ReactNode } from "react";
import { logError } from "@/lib/logger";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode | ((retry: () => void) => ReactNode);
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        logError("Error boundary caught an error", { error, errorInfo });
        this.props.onError?.(error, errorInfo);
    }

    handleRetry = (): void => {
        this.setState({ hasError: false, error: null });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                if (typeof this.props.fallback === "function") {
                    return (this.props.fallback as (retry: () => void) => ReactNode)(this.handleRetry);
                }
                return this.props.fallback;
            }

            return (
                <div className="h-48 w-full rounded-md border bg-muted flex flex-col items-center justify-center gap-3 p-4">
                    <p className="text-sm text-muted-foreground text-center">
                        Something went wrong
                    </p>
                    <Button variant="outline" size="sm" onClick={this.handleRetry}>
                        Retry
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}