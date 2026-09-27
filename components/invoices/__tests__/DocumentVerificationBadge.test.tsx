import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import {
  DocumentVerificationBadge,
  VERIFICATION_TOOLTIPS,
} from "@/components/invoices/DocumentVerificationBadge";
import { InvoiceDocumentsTab } from "@/components/invoices/InvoiceDocumentsTab";
import { readCachedVerification, writeCachedVerification } from "@/lib/cidVerification";

const CID = "QmT78zSuBmuS4z925WZfrqQ1qHaJ56DQaTfyMUF7F8ff5o";

function renderWithQuery(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("DocumentVerificationBadge (#412)", () => {
  it("shows a Verified badge with an accurate tooltip when the hash matches", async () => {
    const verify = vi.fn().mockResolvedValue("verified");
    renderWithQuery(<DocumentVerificationBadge documentUrl={`ipfs://${CID}`} verify={verify} />);

    expect(await screen.findByTestId("document-verification-verified")).toHaveTextContent("Verified");
    expect(verify).toHaveBeenCalledWith(CID);
    expect(
      screen.getByRole("button", { name: new RegExp(VERIFICATION_TOOLTIPS.verified.slice(0, 40)) }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("document-verification-warning")).not.toBeInTheDocument();
  });

  it("shows an Unverified badge and a warning on hash mismatch", async () => {
    renderWithQuery(
      <DocumentVerificationBadge documentUrl={CID} verify={vi.fn().mockResolvedValue("mismatch")} />,
    );

    expect(await screen.findByTestId("document-verification-mismatch")).toHaveTextContent("Unverified");
    expect(screen.getByRole("alert")).toHaveTextContent(/does not match its registered IPFS CID/);
  });

  it("shows a neutral Not verified badge (no warning) when the check can't run", async () => {
    renderWithQuery(
      <DocumentVerificationBadge documentUrl={CID} verify={vi.fn().mockResolvedValue("unavailable")} />,
    );

    expect(await screen.findByTestId("document-verification-unavailable")).toHaveTextContent(
      "Not verified",
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows Verifying… while the check is in progress", () => {
    renderWithQuery(
      <DocumentVerificationBadge documentUrl={CID} verify={() => new Promise(() => {})} />,
    );
    expect(screen.getByTestId("document-verification-verifying")).toHaveTextContent("Verifying");
  });

  it("caches the result per CID in sessionStorage", async () => {
    renderWithQuery(
      <DocumentVerificationBadge documentUrl={CID} verify={vi.fn().mockResolvedValue("verified")} />,
    );
    await screen.findByTestId("document-verification-verified");
    expect(readCachedVerification(CID)).toBe("verified");
  });

  it("uses the cached result without re-fetching", async () => {
    writeCachedVerification(CID, "verified");
    const verify = vi.fn();
    renderWithQuery(<DocumentVerificationBadge documentUrl={CID} verify={verify} />);

    expect(screen.getByTestId("document-verification-verified")).toBeInTheDocument();
    expect(verify).not.toHaveBeenCalled();
  });

  it("renders nothing for documents that are not on IPFS", () => {
    const verify = vi.fn();
    const { container } = renderWithQuery(
      <DocumentVerificationBadge documentUrl="https://example.com/invoice.pdf" verify={verify} />,
    );
    expect(container).toBeEmptyDOMElement();
    expect(verify).not.toHaveBeenCalled();
  });
});

describe("InvoiceDocumentsTab + verification", () => {
  it("does not block document viewing while verification is in progress", async () => {
    // HEAD probe for the viewer succeeds; the raw-block verification fetch hangs.
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) =>
        init?.method === "HEAD"
          ? Promise.resolve(new Response(null, { status: 200 }))
          : new Promise<Response>(() => {}),
      ),
    );

    renderWithQuery(<InvoiceDocumentsTab documentUrl={`ipfs://${CID}/invoice.pdf`} />);

    expect(await screen.findByTestId("document-inline-pdf")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId("document-verification-verifying")).toBeInTheDocument(),
    );
  });
});
