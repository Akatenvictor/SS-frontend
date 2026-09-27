import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

import {
  connectAlbedo,
  connectFreighter,
  connectWithWallet,
  clearStoredWalletSession,
  isAlbedoAvailable,
  isFreighterAvailable,
  isWalletAvailable,
  normalizeAlbedoNetwork,
  normalizeFreighterNetwork,
  readStoredWalletSession,
  revokeProviderSession,
  truncateAddress,
  writeStoredWalletSession,
  SUPPORTED_WALLETS,
  WALLET_INSTALL_URLS,
} from "@/lib/stellar";

const freighterMock = vi.hoisted(() => ({
  isConnected: vi.fn(),
  getPublicKey: vi.fn(),
  requestAccess: vi.fn(),
  getNetwork: vi.fn(),
  signTransaction: vi.fn(),
}));

vi.mock("@stellar/freighter-api", () => freighterMock);

const ADDRESS = "GAXY2HNR7A4YQPCXNKULQZ5HFIJ7QMQNCRQFMQYZ5XHOZQ2MYRMAJ5FK";

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  delete (window as any).albedo;
  delete (window as any).freighter;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("normalizeFreighterNetwork", () => {
  it("maps the PUBLIC passphrase to mainnet and anything else to testnet", () => {
    expect(normalizeFreighterNetwork("PUBLIC")).toBe("mainnet");
    expect(normalizeFreighterNetwork("TESTNET")).toBe("testnet");
    expect(normalizeFreighterNetwork(undefined)).toBe("testnet");
  });
});

describe("normalizeAlbedoNetwork", () => {
  it("handles a bare string", () => {
    expect(normalizeAlbedoNetwork("PUBLIC")).toBe("mainnet");
    expect(normalizeAlbedoNetwork("TESTNET")).toBe("testnet");
  });

  it("handles a single-key object", () => {
    expect(normalizeAlbedoNetwork({ PUBLIC: {} })).toBe("mainnet");
    expect(normalizeAlbedoNetwork({ TESTNET: {} })).toBe("testnet");
  });

  it("finds the populated entry in a full descriptor", () => {
    expect(
      normalizeAlbedoNetwork({ TESTNET: {}, FUTURENET: {}, PUBLIC: { pass: "x" } })
    ).toBe("mainnet");
  });

  it("falls back to testnet for anything unrecognised", () => {
    expect(normalizeAlbedoNetwork(undefined)).toBe("testnet");
    expect(normalizeAlbedoNetwork(null)).toBe("testnet");
    expect(normalizeAlbedoNetwork({})).toBe("testnet");
  });
});

describe("truncateAddress", () => {
  it("keeps short addresses intact and truncates long ones", () => {
    expect(truncateAddress("SHORT")).toBe("SHORT");
    expect(truncateAddress(ADDRESS)).toBe("GAXY...J5FK");
  });
});

describe("wallet detection", () => {
  it("detects Albedo from the injected global", async () => {
    expect(isAlbedoAvailable()).toBe(false);
    expect(await isWalletAvailable("albedo")).toBe(false);

    (window as any).albedo = { enable: vi.fn() };
    expect(isAlbedoAvailable()).toBe(true);
    expect(await isWalletAvailable("albedo")).toBe(true);
  });

  it("treats an injected Freighter global as available without probing", async () => {
    (window as any).freighter = {};
    await expect(isFreighterAvailable()).resolves.toBe(true);
    expect(freighterMock.isConnected).not.toHaveBeenCalled();
  });

  it("falls back to isConnected when the global is absent", async () => {
    freighterMock.isConnected.mockResolvedValue(true);
    await expect(isFreighterAvailable()).resolves.toBe(true);
  });

  it("gives up rather than hanging when Freighter is not installed", async () => {
    vi.useFakeTimers();
    // Mirrors the real library, which never settles when nothing responds.
    freighterMock.isConnected.mockReturnValue(new Promise<boolean>(() => {}));

    const probe = isFreighterAvailable();
    await vi.advanceTimersByTimeAsync(2000);
    await expect(probe).resolves.toBe(false);
  });
});

describe("connectFreighter", () => {
  it("returns the existing session when already authorised", async () => {
    freighterMock.isConnected.mockResolvedValue(true);
    freighterMock.getPublicKey.mockResolvedValue(ADDRESS);
    freighterMock.getNetwork.mockResolvedValue("PUBLIC");

    await expect(connectFreighter()).resolves.toEqual({
      address: ADDRESS,
      network: "mainnet",
      wallet: "freighter",
    });
  });

  it("requests access when not yet authorised", async () => {
    freighterMock.isConnected.mockResolvedValue(false);
    freighterMock.requestAccess.mockResolvedValue(ADDRESS);
    freighterMock.getNetwork.mockResolvedValue("TESTNET");

    const result = await connectFreighter();
    expect(result?.address).toBe(ADDRESS);
    expect(result?.network).toBe("testnet");
    expect(freighterMock.requestAccess).toHaveBeenCalled();
  });

  it("returns null when access is refused", async () => {
    freighterMock.isConnected.mockResolvedValue(false);
    freighterMock.requestAccess.mockResolvedValue("");
    await expect(connectFreighter()).resolves.toBeNull();
  });

  it("returns null instead of throwing when the extension misbehaves", async () => {
    freighterMock.isConnected.mockRejectedValue(new Error("no extension"));
    await expect(connectFreighter()).resolves.toBeNull();
  });
});

describe("connectAlbedo", () => {
  it("resolves the address and network from enable()", async () => {
    (window as any).albedo = {
      enable: vi.fn().mockResolvedValue({ address: ADDRESS, network: { TESTNET: {} } }),
      network: vi.fn(),
    };

    await expect(connectAlbedo()).resolves.toEqual({
      address: ADDRESS,
      network: "testnet",
      wallet: "albedo",
    });
  });

  it("falls back to albedo.address and albedo.network()", async () => {
    (window as any).albedo = {
      address: ADDRESS,
      enable: vi.fn().mockResolvedValue({}),
      network: vi.fn().mockResolvedValue({ PUBLIC: {} }),
    };

    const result = await connectAlbedo();
    expect(result?.address).toBe(ADDRESS);
    expect(result?.network).toBe("mainnet");
  });

  it("returns null when the user rejects the prompt", async () => {
    // Albedo signals rejection with a numeric error code, not a rejection.
    (window as any).albedo = { enable: vi.fn().mockResolvedValue(4001) };
    await expect(connectAlbedo()).resolves.toBeNull();
  });

  it("returns null when the extension is absent", async () => {
    await expect(connectAlbedo()).resolves.toBeNull();
  });
});

describe("connectWithWallet", () => {
  it("routes to the right connector", async () => {
    freighterMock.isConnected.mockResolvedValue(true);
    freighterMock.getPublicKey.mockResolvedValue(ADDRESS);
    freighterMock.getNetwork.mockResolvedValue("TESTNET");
    expect((await connectWithWallet("freighter"))?.wallet).toBe("freighter");

    (window as any).albedo = {
      enable: vi.fn().mockResolvedValue({ address: ADDRESS, network: "TESTNET" }),
    };
    expect((await connectWithWallet("albedo"))?.wallet).toBe("albedo");
  });
});

describe("session persistence", () => {
  it("round-trips a stored session", () => {
    writeStoredWalletSession({ wallet: "albedo", address: ADDRESS, network: "mainnet" });
    expect(readStoredWalletSession()).toEqual({
      wallet: "albedo",
      address: ADDRESS,
      network: "mainnet",
    });
  });

  it("restores a session after a simulated page refresh", () => {
    writeStoredWalletSession({ wallet: "freighter", address: ADDRESS, network: "testnet" });
    // A refresh re-runs the provider's init effect, reading from storage only.
    expect(readStoredWalletSession()?.address).toBe(ADDRESS);
  });

  it("clears the session on disconnect", () => {
    writeStoredWalletSession({ wallet: "freighter", address: ADDRESS, network: "testnet" });
    clearStoredWalletSession();
    expect(readStoredWalletSession()).toBeNull();
    expect(localStorage.getItem("stellarsettle.wallet")).toBeNull();
  });

  it("ignores malformed, empty and unknown-wallet payloads", () => {
    localStorage.setItem("stellarsettle.wallet", "{not json");
    expect(readStoredWalletSession()).toBeNull();

    localStorage.setItem("stellarsettle.wallet", JSON.stringify({ wallet: "freighter" }));
    expect(readStoredWalletSession()).toBeNull();

    localStorage.setItem(
      "stellarsettle.wallet",
      JSON.stringify({ wallet: "ledger", address: ADDRESS })
    );
    expect(readStoredWalletSession()).toBeNull();
  });

  it("normalises an unexpected network value to testnet", () => {
    localStorage.setItem(
      "stellarsettle.wallet",
      JSON.stringify({ wallet: "freighter", address: ADDRESS, network: "mars" })
    );
    expect(readStoredWalletSession()?.network).toBe("testnet");
  });
});

describe("revokeProviderSession", () => {
  it("asks Albedo to log out", async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    (window as any).albedo = { logout };

    await revokeProviderSession("albedo");
    expect(logout).toHaveBeenCalled();
  });

  it("is a no-op for Freighter, which has no equivalent", async () => {
    await expect(revokeProviderSession("freighter")).resolves.toBeUndefined();
    await expect(revokeProviderSession(null)).resolves.toBeUndefined();
  });

  it("swallows errors from the extension", async () => {
    (window as any).albedo = { logout: vi.fn().mockRejectedValue(new Error("nope")) };
    await expect(revokeProviderSession("albedo")).resolves.toBeUndefined();
  });
});

describe("supported wallet metadata", () => {
  it("exposes an install URL for every supported wallet", () => {
    for (const wallet of SUPPORTED_WALLETS) {
      expect(WALLET_INSTALL_URLS[wallet]).toMatch(/^https:\/\//);
    }
  });
});
