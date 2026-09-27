"use client";

/**
 * Documents tab (issue #376)
 *
 * Renders the invoice's supporting documents straight from IPFS. PDFs and
 * images are shown inline; anything else is offered as a download. IPFS
 * gateways are unreliable, so a document that fails on the first gateway is
 * retried against the next one before the user is shown an error.
 */

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, FileWarning, Image as ImageIcon, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentVerificationBadge } from "@/components/invoices/DocumentVerificationBadge";
import {
  documentFileName,
  guessDocumentKind,
  ipfsGatewayCandidates,
  isIpfsReference,
  type DocumentKind,
} from "@/lib/ipfs";

function kindIcon(kind: DocumentKind) {
  return kind === "image" ? ImageIcon : kind === "pdf" ? FileText : FileWarning;
}

/**
 * Inline viewer. `<img>` is used rather than fetching a blob so a large PDF is
 * streamed by the browser instead of being buffered in memory.
 */
function DocumentViewer({
  url,
  kind,
  name,
  onRenderError,
}: {
  url: string;
  kind: DocumentKind;
  name: string;
  onRenderError: () => void;
}) {
  if (kind === "image") {
    return (
      <img
        src={url}
        alt={name}
        data-testid="document-inline-image"
        onError={onRenderError}
        className="max-h-[70vh] w-full rounded-lg border object-contain"
      />
    );
  }

  if (kind === "pdf") {
    return (
      <object
        data={url}
        type="application/pdf"
        data-testid="document-inline-pdf"
        className="h-[70vh] w-full rounded-lg border"
      >
        {/* Shown by the browser when it cannot render a PDF inline. */}
        <p className="p-6 text-center text-sm text-muted-foreground">
          Your browser cannot display this PDF inline.{" "}
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
            Open it in a new tab
          </a>
          .
        </p>
      </object>
    );
  }

  return (
    <div
      className="rounded-lg border border-dashed p-10 text-center"
      data-testid="document-no-inline-viewer"
    >
      <FileWarning className="mx-auto h-8 w-8 text-muted-foreground" />
      <p className="mt-2 text-sm font-medium">{name}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        This file type cannot be previewed in the browser.
      </p>
      <Button asChild className="mt-4">
        <a href={url} target="_blank" rel="noopener noreferrer" data-testid="document-download-link">
          <ExternalLink />
          Open document
        </a>
      </Button>
    </div>
  );
}

function IpfsDocumentPanel({ documentUrl }: { documentUrl: string }) {
  const candidates = ipfsGatewayCandidates(documentUrl);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  // A new document resets the retry state.
  useEffect(() => {
    setCandidateIndex(0);
    setFailed(false);
  }, [documentUrl]);

  // ipfs:// and bare CIDs are recorded by some issuers, so they have to be
  // verified as reachable before claiming the document is missing.
  const { isLoading, isError, isFetching } = useQuery({
    queryKey: ["ipfs-document", documentUrl, candidateIndex],
    queryFn: async () => {
      const url = candidates[candidateIndex];
      const res = await fetch(url, { method: "HEAD" });
      if (!res.ok) throw new Error(`Document unavailable (${res.status})`);
      return url;
    },
    enabled: candidates.length > 0,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  if (candidates.length === 0) {
    return <p className="text-sm text-muted-foreground">No document attached</p>;
  }

  if (isLoading || isFetching) {
    return <Skeleton className="h-72 w-full" data-testid="document-loading" />;
  }

  if (isError || failed) {
    const hasAnotherGateway = candidateIndex + 1 < candidates.length;
    return (
      <div
        className="rounded-lg border border-dashed p-8 text-center"
        data-testid="document-unavailable"
      >
        <FileWarning className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium">Document could not be loaded</p>
        <p className="mt-1 text-sm text-muted-foreground">
          The file is stored on IPFS and may be temporarily unreachable.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          {hasAnotherGateway && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFailed(false);
                setCandidateIndex((index) => index + 1);
              }}
              data-testid="document-retry-gateway"
            >
              <RefreshCw />
              Try another gateway
            </Button>
          )}
          <Button asChild variant="ghost" size="sm">
            <a
              href={candidates[candidateIndex]}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink />
              Open directly
            </a>
          </Button>
        </div>
      </div>
    );
  }

  const url = candidates[candidateIndex];
  const name = documentFileName(documentUrl);
  const kind = guessDocumentKind(documentUrl);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-2 text-sm font-medium" data-testid="document-name">
          {(() => {
            const Icon = kindIcon(kind);
            return <Icon className="h-4 w-4 shrink-0" />;
          })()}
          <span className="truncate">{name}</span>
        </p>
        <Button asChild variant="ghost" size="sm">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="document-open-external"
          >
            <ExternalLink />
            Open
          </a>
        </Button>
      </div>

      {isIpfsReference(documentUrl) && (
        <p className="text-xs text-muted-foreground" data-testid="document-ipfs-source">
          Stored on IPFS
        </p>
      )}

      {/* Integrity check runs in the background and never blocks the viewer (#412). */}
      <DocumentVerificationBadge documentUrl={documentUrl} />

      <DocumentViewer
        url={url}
        kind={kind}
        name={name}
        onRenderError={() => {
          // The HEAD probe passed but the bytes did not render — treat it the
          // same as an unreachable gateway.
          setFailed(true);
        }}
      />
    </div>
  );
}

interface InvoiceDocumentsTabProps {
  /** Primary document, as returned by the API. */
  documentUrl: string | null;
  /** Any additional supporting documents the issuer attached. */
  additionalDocuments?: string[];
}

/**
 * Tabbed document viewer. With a single document the tab bar is hidden and
 * the document is shown directly, which is the common case.
 */
export function InvoiceDocumentsTab({
  documentUrl,
  additionalDocuments = [],
}: InvoiceDocumentsTabProps) {
  const extras = additionalDocuments.filter((url) => Boolean(url));
  const primary = documentUrl ?? null;

  if (!primary && extras.length === 0) {
    return (
      <Card data-testid="invoice-documents">
        <CardHeader>
          <h2 className="text-lg font-semibold">Documents</h2>
        </CardHeader>
        <CardContent>
          <p className="py-6 text-center text-sm text-muted-foreground" data-testid="documents-empty">
            No documents have been attached to this invoice.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!primary) {
    return (
      <Card data-testid="invoice-documents">
        <CardHeader>
          <h2 className="text-lg font-semibold">Documents</h2>
        </CardHeader>
        <CardContent>
          <IpfsDocumentPanel documentUrl={extras[0]} />
        </CardContent>
      </Card>
    );
  }

  const documents = [primary, ...extras];

  if (documents.length === 1) {
    return (
      <Card data-testid="invoice-documents">
        <CardHeader>
          <h2 className="text-lg font-semibold">Documents</h2>
        </CardHeader>
        <CardContent>
          <IpfsDocumentPanel documentUrl={primary} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="invoice-documents">
      <CardHeader>
        <h2 className="text-lg font-semibold">Documents</h2>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={primary}>
          <TabsList>
            {documents.map((url) => (
              <TabsTrigger key={url} value={url}>
                {documentFileName(url)}
              </TabsTrigger>
            ))}
          </TabsList>
          {documents.map((url) => (
            <TabsContent key={url} value={url} className="mt-4">
              <IpfsDocumentPanel documentUrl={url} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
