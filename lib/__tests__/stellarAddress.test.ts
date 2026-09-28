import { describe, it, expect } from "vitest";

import {
  isValidStellarAddress,
  stellarAddressError,
  transactionExplorerUrl,
} from "@/lib/stellarAddress";

/**
 * Real ed25519 public keys. Hand-typed Stellar addresses fail the base58
 * checksum, so these are generated rather than invented — a fake "valid"
 * address in this file would make the positive cases assert nothing.
 */
const VALID = [
  "GBV5S74OIWYREQGBNXORIC2D4Y66YMOUQPVIXBHKFPF637GKJKENZBYV",
  "GDSCGKMCYSB6Z7K7PPCABF6VOAX7H6YI5GRDZUCMOUCG7ORDKZUXUETS",
];

describe("isValidStellarAddress", () => {
  it("accepts a real Stellar address", () => {
    expect(isValidStellarAddress(VALID[0])).toBe(true);
  });

  it("trims surrounding whitespace before validating", () => {
    expect(isValidStellarAddress(`  ${VALID[0]}  `)).toBe(true);
  });

  it("rejects a mangled address with a bad base58 checksum", () => {
    expect(isValidStellarAddress(`${VALID[0].slice(0, -1)}X`)).toBe(false);
  });

  it("rejects a truncated address", () => {
    expect(isValidStellarAddress(VALID[0].slice(0, 20))).toBe(false);
  });

  it("rejects a contract address — this is a payment destination", () => {
    const contract = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    expect(isValidStellarAddress(contract)).toBe(false);
    expect(stellarAddressError(contract)).toMatch(/contract address/i);
  });

  it("rejects a muxed account", () => {
    const muxed = "MAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    expect(isValidStellarAddress(muxed)).toBe(false);
    expect(stellarAddressError(muxed)).toMatch(/muxed/i);
  });

  it("rejects an address with the wrong prefix", () => {
    expect(isValidStellarAddress("SB5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN")).toBe(
      false
    );
    expect(stellarAddressError("SB5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN")).toMatch(
      /start with G/i
    );
  });

  it("rejects empty, blank and missing input", () => {
    expect(isValidStellarAddress("")).toBe(false);
    expect(isValidStellarAddress("   ")).toBe(false);
    expect(isValidStellarAddress(null)).toBe(false);
    expect(isValidStellarAddress(undefined)).toBe(false);
  });
});

describe("stellarAddressError", () => {
  it("is null for a blank field, so it is not shown before typing", () => {
    expect(stellarAddressError("")).toBeNull();
    expect(stellarAddressError("   ")).toBeNull();
    expect(stellarAddressError(null)).toBeNull();
  });

  it("is null for a valid address", () => {
    expect(stellarAddressError(VALID[1])).toBeNull();
  });

  it("names the specific problem rather than a generic failure", () => {
    expect(stellarAddressError("nonsense")).toBe("Stellar addresses start with G");
    expect(stellarAddressError("Gnotbase58!!")).toBe("Invalid Stellar address");
  });

  it("agrees with isValidStellarAddress on every non-blank input", () => {
    // Blank input is the one deliberate divergence: isValid is a hard
    // predicate, while the error helper stays silent so the modal does not
    // scold an untouched field. Every other input must agree.
    for (const candidate of [VALID[0], "nonsense", "Gnotbase58!!", "CAAAA", "MAAAA"]) {
      expect(stellarAddressError(candidate) === null).toBe(
        isValidStellarAddress(candidate)
      );
    }
  });

  it("is silent on blank input while the predicate rejects it", () => {
    expect(stellarAddressError("")).toBeNull();
    expect(isValidStellarAddress("")).toBe(false);
  });
});

describe("transactionExplorerUrl", () => {
  it("points at the testnet explorer by default", () => {
    expect(transactionExplorerUrl("abc123")).toBe(
      "https://stellar.expert/explorer/testnet/tx/abc123"
    );
  });

  it("points at mainnet when the wallet is on mainnet", () => {
    expect(transactionExplorerUrl("abc123", "mainnet")).toBe(
      "https://stellar.expert/explorer/mainnet/tx/abc123"
    );
  });

  it("embeds the hash so the link is a deep link to that transaction", () => {
    expect(transactionExplorerUrl("deadbeef", "testnet")).toContain("/tx/deadbeef");
  });
});
