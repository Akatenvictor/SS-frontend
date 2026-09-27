import { afterEach, describe, expect, it, vi } from "vitest";
import {
  base58btcDecode,
  cidSha256Digest,
  extractRootCid,
  readCachedVerification,
  verifyCid,
  writeCachedVerification,
} from "@/lib/cidVerification";

const hex = (b: Uint8Array | null) => (b ? Buffer.from(b).toString("hex") : null);

// Real, independently known vectors (#412):
// 1. Raw CIDv1 of the bytes "hello world".
const RAW_CID = "bafkreifzjut3te2nhyekklss27nh3k72ysco7y32koao5eei66wof36n5e";
const RAW_BLOCK = new TextEncoder().encode("hello world");
const RAW_DIGEST = "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9";
// 2. CIDv0 that `ipfs add` produces for "hello world\n": a dag-pb UnixFS node
//    whose raw block is 0a12 0802 120c <"hello world\n"> 180c.
const V0_CID = "QmT78zSuBmuS4z925WZfrqQ1qHaJ56DQaTfyMUF7F8ff5o";
const V0_BLOCK = Uint8Array.from(
  Buffer.from("0a120802120c68656c6c6f20776f726c640a180c", "hex"),
);
const V0_DIGEST = "46d44814b9c5af141c3aaab7c05dc5e844ead5f91f12858b021eba45768b4c0e";

function blockResponse(bytes: Uint8Array, status = 200) {
  return new Response(Uint8Array.from(bytes).buffer, { status });
}

afterEach(() => {
  vi.restoreAllMocks(); // first, so a mocked-out sessionStorage getter is restored
  window.sessionStorage.clear();
});

describe("cidSha256Digest", () => {
  it("decodes a raw CIDv1 to the SHA-256 of its bytes", () => {
    expect(hex(cidSha256Digest(RAW_CID))).toBe(RAW_DIGEST);
  });

  it("decodes a CIDv0 to the SHA-256 of its dag-pb block", () => {
    expect(hex(cidSha256Digest(V0_CID))).toBe(V0_DIGEST);
  });

  it("returns null for unsupported or malformed CIDs", () => {
    expect(cidSha256Digest("not-a-cid")).toBeNull();
    expect(cidSha256Digest("Qm0OIl")).toBeNull(); // invalid base58 chars
    expect(cidSha256Digest("zb2rhe5P4gXftAwvA4eXQ5HJwsER2owDyS9sKaQRRVQPn93bA")).toBeNull(); // base58 CIDv1
  });
});

describe("base58btcDecode", () => {
  it("preserves leading zero bytes", () => {
    expect(Array.from(base58btcDecode("11") ?? [])).toEqual([0, 0]);
    expect(Array.from(base58btcDecode("12") ?? [])).toEqual([0, 1]);
  });
});

describe("extractRootCid", () => {
  it("handles every reference shape the API returns", () => {
    expect(extractRootCid(V0_CID)).toBe(V0_CID);
    expect(extractRootCid(`ipfs://${V0_CID}`)).toBe(V0_CID);
    expect(extractRootCid(`ipfs://${RAW_CID}/invoice.pdf`)).toBe(RAW_CID);
    expect(extractRootCid(`https://ipfs.io/ipfs/${V0_CID}/invoice.pdf?x=1`)).toBe(V0_CID);
  });

  it("returns null for non-IPFS documents", () => {
    expect(extractRootCid("https://example.com/invoice.pdf")).toBeNull();
    expect(extractRootCid("")).toBeNull();
  });
});

describe("verifyCid", () => {
  it("verifies a raw CID against its block", async () => {
    const fetchMock = vi.fn().mockResolvedValue(blockResponse(RAW_BLOCK));
    await expect(verifyCid(RAW_CID, fetchMock, ["https://gw/ipfs/"])).resolves.toBe("verified");
    expect(fetchMock).toHaveBeenCalledWith(`https://gw/ipfs/${RAW_CID}?format=raw`, {
      headers: { Accept: "application/vnd.ipld.raw" },
    });
  });

  it("verifies a dag-pb CIDv0 against its raw block (not the file bytes)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(blockResponse(V0_BLOCK));
    await expect(verifyCid(V0_CID, fetchMock, ["https://gw/ipfs/"])).resolves.toBe("verified");
  });

  it("reports a mismatch when the served block has been altered", async () => {
    const tampered = Uint8Array.from(V0_BLOCK);
    tampered[10] ^= 0xff;
    const fetchMock = vi.fn().mockResolvedValue(blockResponse(tampered));
    await expect(verifyCid(V0_CID, fetchMock, ["https://gw/ipfs/"])).resolves.toBe("mismatch");
  });

  it("falls through unreachable gateways to the next one", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(blockResponse(new Uint8Array(), 504))
      .mockResolvedValueOnce(blockResponse(RAW_BLOCK));
    await expect(verifyCid(RAW_CID, fetchMock, ["https://a/", "https://b/", "https://c/"])).resolves.toBe(
      "verified",
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("is unavailable (never mismatch) when no gateway can serve the block", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(verifyCid(RAW_CID, fetchMock, ["https://a/", "https://b/"])).resolves.toBe(
      "unavailable",
    );
  });

  it("is unavailable for unsupported CIDs without fetching", async () => {
    const fetchMock = vi.fn();
    await expect(verifyCid("not-a-cid", fetchMock)).resolves.toBe("unavailable");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("session cache", () => {
  it("caches definitive results per CID", () => {
    writeCachedVerification(V0_CID, "verified");
    writeCachedVerification(RAW_CID, "mismatch");
    expect(readCachedVerification(V0_CID)).toBe("verified");
    expect(readCachedVerification(RAW_CID)).toBe("mismatch");
  });

  it("does not cache 'unavailable' so the check is retried later", () => {
    writeCachedVerification(V0_CID, "unavailable");
    expect(readCachedVerification(V0_CID)).toBeNull();
  });

  it("degrades gracefully when sessionStorage throws", () => {
    // Some browsers throw on the property access itself when storage is blocked.
    vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    expect(() => writeCachedVerification(V0_CID, "verified")).not.toThrow();
    expect(readCachedVerification(V0_CID)).toBeNull();
  });
});
