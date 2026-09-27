import { describe, it, expect } from "vitest";

import {
  IPFS_GATEWAYS,
  documentFileName,
  guessDocumentKind,
  ipfsGatewayCandidates,
  isCid,
  isIpfsReference,
  isIpfsUri,
  resolveIpfsUrl,
} from "@/lib/ipfs";

const CID = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";
const CIDV1 = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";

describe("IPFS reference detection", () => {
  it("recognises ipfs:// URIs", () => {
    expect(isIpfsUri(`ipfs://${CID}`)).toBe(true);
    expect(isIpfsUri(`https://ipfs.io/ipfs/${CID}`)).toBe(false);
  });

  it("recognises both CID formats", () => {
    expect(isCid(CID)).toBe(true);
    expect(isCid(CIDV1)).toBe(true);
    expect(isCid("not-a-cid")).toBe(false);
    expect(isCid("")).toBe(false);
  });

  it("treats URIs and CIDs as IPFS references but not http URLs", () => {
    expect(isIpfsReference(`ipfs://${CID}`)).toBe(true);
    expect(isIpfsReference(CID)).toBe(true);
    expect(isIpfsReference("https://example.com/a.pdf")).toBe(false);
  });
});

describe("ipfsGatewayCandidates", () => {
  it("offers every gateway in order", () => {
    const candidates = ipfsGatewayCandidates(`ipfs://${CID}`);
    expect(candidates).toHaveLength(IPFS_GATEWAYS.length);
    expect(candidates[0]).toBe(`${IPFS_GATEWAYS[0]}${CID}`);
  });

  it("accepts a bare CID", () => {
    expect(ipfsGatewayCandidates(CID)[0]).toBe(`${IPFS_GATEWAYS[0]}${CID}`);
  });

  it("preserves the sub-path after the CID", () => {
    expect(ipfsGatewayCandidates(`ipfs://${CID}/invoice.pdf`)[0]).toBe(
      `${IPFS_GATEWAYS[0]}${CID}/invoice.pdf`
    );
  });

  it("passes an http(s) URL straight through", () => {
    expect(ipfsGatewayCandidates("https://cdn.example.com/a.pdf")).toEqual([
      "https://cdn.example.com/a.pdf",
    ]);
  });

  it("returns nothing for an empty reference", () => {
    expect(ipfsGatewayCandidates("")).toEqual([]);
  });
});

describe("resolveIpfsUrl", () => {
  it("resolves each supported form to the first gateway", () => {
    expect(resolveIpfsUrl(`ipfs://${CID}`)).toBe(`${IPFS_GATEWAYS[0]}${CID}`);
    expect(resolveIpfsUrl(CID)).toBe(`${IPFS_GATEWAYS[0]}${CID}`);
    expect(resolveIpfsUrl("")).toBeNull();
  });
});

describe("guessDocumentKind", () => {
  it("detects PDFs, images and everything else", () => {
    expect(guessDocumentKind(`ipfs://${CID}/invoice.pdf`)).toBe("pdf");
    expect(guessDocumentKind(`ipfs://${CID}/scan.PDF`)).toBe("pdf");
    expect(guessDocumentKind(`ipfs://${CID}/scan.png`)).toBe("image");
    expect(guessDocumentKind(`ipfs://${CID}/scan.jpeg`)).toBe("image");
    expect(guessDocumentKind(`ipfs://${CID}/ledger.zip`)).toBe("other");
  });

  it("ignores a query string", () => {
    expect(guessDocumentKind("https://example.com/a.pdf?download=1")).toBe("pdf");
  });

  it("treats an extensionless reference as non-previewable", () => {
    expect(guessDocumentKind(CID)).toBe("other");
  });
});

describe("documentFileName", () => {
  it("uses the last path segment", () => {
    expect(documentFileName(`ipfs://${CID}/invoice.pdf`)).toBe("invoice.pdf");
  });

  it("labels a bare CID as a PDF rather than showing a hash", () => {
    expect(documentFileName(CID)).toBe("invoice-document.pdf");
  });

  it("falls back when there is no usable segment", () => {
    expect(documentFileName("")).toBe("invoice-document");
  });
});
