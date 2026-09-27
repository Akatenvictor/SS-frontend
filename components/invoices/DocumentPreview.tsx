"use client";

import { useQuery } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/invoices/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface DocumentPreviewProps {
    documentUrl: string | null;
}

function PreviewFallback({ documentUrl, onRetry }: { documentUrl: string; onRetry: () => void }) {
    return (
        <div className="h-48 w-full rounded-md border bg-muted flex flex-col items-center justify-center gap-3 p-4">
            <p className="text-sm text-muted-foreground text-center">
                Document preview unavailable
            </p>
            <div className="flex items-center gap-2">
                <a
                    href={documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary underline"
                >
                    Download directly
                </a>
                <Button variant="outline" size="sm" onClick={onRetry}>
                    Retry
                </Button>
            </div>
        </div>
    );
}

function DocumentPreviewContent({ documentUrl }: { documentUrl: string }) {
    const { data, isLoading, isError } = useQuery({
        queryKey: ["document-preview", documentUrl],
        queryFn: async () => {
            const res = await fetch(documentUrl);
            if (!res.ok) throw new Error(`Failed to fetch document: ${res.status}`);
            return res.blob();
        },
        staleTime: 5 * 60 * 1000,
        retry: 1,
    });

    if (isLoading) {
        return (
            <div className="h-48 w-full rounded-md border bg-muted flex items-center justify-center">
                <Skeleton className="h-40 w-full" />
            </div>
        );
    }

    if (isError || !data) {
        throw new Error("Failed to load document preview");
    }

    const objectUrl = URL.createObjectURL(data);

    return (
        <div className="h-48 w-full rounded-md border bg-muted flex items-center justify-center">
            <a
                href={objectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary underline"
                onClick={() => {
                    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
                }}
            >
                View Document
            </a>
        </div>
    );
}

export function DocumentPreview({ documentUrl }: DocumentPreviewProps) {
    if (!documentUrl) {
        return (
            <p className="text-sm text-muted-foreground text-center py-8">
                No document attached
            </p>
        );
    }

    return (
        <ErrorBoundary fallback={(retry: () => void) => (
            <PreviewFallback documentUrl={documentUrl} onRetry={retry} />
        )}>
            <DocumentPreviewContent documentUrl={documentUrl} />
        </ErrorBoundary>
    );
}