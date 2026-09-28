import { describe, it, expect, afterEach, vi } from "vitest";
import { fetchUsdcBalance, getUsdcAsset, parseStellarAmount } from "@/lib/stellar/usdc";

const TESTNET_USDC_ISSUER = "GBBDN7L42JAAFLCW2XYYN62YQH5AWCWQ2R2SGEHX6E2ARXEHXWZ4YMW";
const MAINNET_USDC_ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

const ADDRESS = "GD5X6MPY7HXHYHZWRXKJQKQ7T2WQ2Y3H4ZQ2Y2KQ2WQ2Y2KQ2WQ2Y2KQ2";

function mockFetchResponse(body: unknown, init: { status?: number; ok?: boolean } = {}) {
    return vi.fn().mockResolvedValue({
        ok: init.ok ?? (init.status ?? 200) < 400,
        status: init.status ?? 200,
        json: async () => body,
    });
}

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe("getUsdcAsset", () => {
    it("returns the USDC issuer for each network", () => {
        expect(getUsdcAsset("testnet")).toEqual({
            assetCode: "USDC",
            assetIssuer: TESTNET_USDC_ISSUER,
        });
        expect(getUsdcAsset("mainnet")).toEqual({
            assetCode: "USDC",
            assetIssuer: MAINNET_USDC_ISSUER,
        });
    });

    it("defaults to testnet", () => {
        expect(getUsdcAsset().assetIssuer).toBe(TESTNET_USDC_ISSUER);
    });
});

describe("fetchUsdcBalance", () => {
    it("reads the USDC trustline balance from the account payload", async () => {
        const fetchMock = mockFetchResponse({
            balances: [
                { asset_type: "native", balance: "100.0000000" },
                {
                    asset_type: "credit_alphanum4",
                    asset_code: "USDC",
                    asset_issuer: TESTNET_USDC_ISSUER,
                    balance: "1250.5000000",
                },
            ],
        });
        vi.stubGlobal("fetch", fetchMock);

        const balance = await fetchUsdcBalance(ADDRESS, "testnet");

        expect(balance).toBe(1250.5);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const url = fetchMock.mock.calls[0][0] as string;
        expect(url).toContain("/accounts/");
        expect(url).toContain(ADDRESS);
    });

    it("queries the account endpoint on the network's Horizon host", async () => {
        const fetchMock = mockFetchResponse({ balances: [] });
        vi.stubGlobal("fetch", fetchMock);

        await fetchUsdcBalance(ADDRESS, "testnet");

        expect(fetchMock.mock.calls[0][0]).toContain("horizon-testnet.stellar.org");
    });

    it("returns 0 when the account has no USDC trustline", async () => {
        vi.stubGlobal(
            "fetch",
            mockFetchResponse({
                balances: [
                    { asset_type: "native", balance: "10.0000000" },
                    {
                        asset_type: "credit_alphanum4",
                        asset_code: "USDT",
                        asset_issuer: TESTNET_USDC_ISSUER,
                        balance: "99.0000000",
                    },
                ],
            })
        );

        expect(await fetchUsdcBalance(ADDRESS, "testnet")).toBe(0);
    });

    it("ignores a USDC balance from a different issuer", async () => {
        vi.stubGlobal(
            "fetch",
            mockFetchResponse({
                balances: [
                    {
                        asset_type: "credit_alphanum4",
                        asset_code: "USDC",
                        asset_issuer: "SOMEONEELSEISSUERADDRESSFORTESTINGPURPOSES0000000",
                        balance: "500.0000000",
                    },
                ],
            })
        );

        expect(await fetchUsdcBalance(ADDRESS, "testnet")).toBe(0);
    });

    it("returns 0 for an account Horizon does not know yet", async () => {
        vi.stubGlobal("fetch", mockFetchResponse({}, { status: 404 }));

        expect(await fetchUsdcBalance(ADDRESS, "testnet")).toBe(0);
    });

    it("throws on a server error so the UI can distinguish failure from zero", async () => {
        vi.stubGlobal("fetch", mockFetchResponse({}, { status: 500 }));

        await expect(fetchUsdcBalance(ADDRESS, "testnet")).rejects.toThrow(
            /Failed to fetch USDC balance/
        );
    });

    it("returns 0 without calling Horizon for an empty address", async () => {
        const fetchMock = mockFetchResponse({ balances: [] });
        vi.stubGlobal("fetch", fetchMock);

        expect(await fetchUsdcBalance("")).toBe(0);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("handles an account with no balances array", async () => {
        vi.stubGlobal("fetch", mockFetchResponse({}));
        expect(await fetchUsdcBalance(ADDRESS, "testnet")).toBe(0);
    });
});

describe("parseStellarAmount", () => {
    it("parses Horizon decimal strings", () => {
        expect(parseStellarAmount("1250.5000000")).toBe(1250.5);
    });

    it("falls back to 0 for null, undefined and NaN input", () => {
        expect(parseStellarAmount(null)).toBe(0);
        expect(parseStellarAmount(undefined)).toBe(0);
        expect(parseStellarAmount("not-a-number")).toBe(0);
    });
});
