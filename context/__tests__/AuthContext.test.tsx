import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";
import { AuthProvider, useAuth } from "../AuthContext";
import { toast } from "sonner";
import * as Freighter from "@stellar/freighter-api";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@stellar/freighter-api", () => ({
  isConnected: vi.fn(),
  requestAccess: vi.fn(),
  getPublicKey: vi.fn(),
  signTransaction: vi.fn(),
}));

describe("AuthContext - Wallet Challenge-Verify Authentication Flow", () => {
  const mockAddress = "GPUBLICKEY1234567890STEL";
  const mockChallengeXdr = "AAAAA_CHALLENGE_XDR_MOCK";
  const mockSignedXdr = "AAAAA_SIGNED_XDR_MOCK";
  const mockJwt = "eyJhbGciOiJub25lIn0.eyJleHAiOjQ3MDAwMDAwMDB9.sig";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    localStorage.clear();
    
    // Default fetch mock setup
    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.endsWith("/auth/challenge")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ challengeXdr: mockChallengeXdr }),
        } as Response);
      }
      if (url.endsWith("/auth/verify")) {
        const body = JSON.parse((init?.body as string) || "{}");
        if (body.signedXdr === "INVALID_SIGNATURE_XDR") {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ message: "Invalid signature" }),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ token: mockJwt }),
        } as Response);
      }
      return Promise.reject(new Error("Unknown endpoint"));
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("1. Valid signature stores JWT in auth context", async () => {
    vi.mocked(Freighter.isConnected).mockResolvedValue(true);
    vi.mocked(Freighter.getPublicKey).mockResolvedValue(mockAddress);
    vi.mocked(Freighter.signTransaction).mockResolvedValue(mockSignedXdr);

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    expect(result.current.jwt).toBeNull();
    expect(result.current.isConnecting).toBe(false);

    await act(async () => {
      await result.current.loginWithWallet();
    });

    expect(result.current.jwt).toBe(mockJwt);
    expect(result.current.address).toBe(mockAddress);
    expect(JSON.parse(localStorage.getItem("stellarsettle.auth-session")!)).toEqual({
      jwt: mockJwt,
      address: mockAddress,
    });
    expect(result.current.isConnecting).toBe(false);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("restores an unexpired wallet session after a page reload", async () => {
    localStorage.setItem(
      "stellarsettle.auth-session",
      JSON.stringify({ jwt: mockJwt, address: mockAddress }),
    );

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await waitFor(() => expect(result.current.isInitializing).toBe(false));
    expect(result.current.jwt).toBe(mockJwt);
    expect(result.current.address).toBe(mockAddress);
  });

  it("2. Invalid signature returns an error toast and does not store a token", async () => {
    vi.mocked(Freighter.isConnected).mockResolvedValue(true);
    vi.mocked(Freighter.getPublicKey).mockResolvedValue(mockAddress);
    vi.mocked(Freighter.signTransaction).mockResolvedValue("INVALID_SIGNATURE_XDR");

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await act(async () => {
      await result.current.loginWithWallet();
    });

    expect(toast.error).toHaveBeenCalledWith("Invalid signature");
    expect(result.current.jwt).toBeNull();
    expect(result.current.isConnecting).toBe(false);
  });

  it("3. Challenge step times out after 60 seconds and shows 'Challenge expired — please try again'", async () => {
    vi.useFakeTimers();

    vi.mocked(Freighter.isConnected).mockResolvedValue(true);
    vi.mocked(Freighter.getPublicKey).mockResolvedValue(mockAddress);
    // signTransaction hangs indefinitely
    vi.mocked(Freighter.signTransaction).mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    let loginPromise: Promise<void>;
    act(() => {
      loginPromise = result.current.loginWithWallet();
    });

    // Advance 60 seconds
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60000);
      await loginPromise;
    });

    expect(toast.error).toHaveBeenCalledWith("Challenge expired — please try again");
    expect(result.current.jwt).toBeNull();
    expect(result.current.isConnecting).toBe(false);
  });

  it("4. Cancelling the wallet signing prompt shows 'Connection cancelled' and resets the connect button", async () => {
    vi.mocked(Freighter.isConnected).mockResolvedValue(true);
    vi.mocked(Freighter.getPublicKey).mockResolvedValue(mockAddress);
    vi.mocked(Freighter.signTransaction).mockRejectedValue(new Error("User cancelled transaction signing"));

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await act(async () => {
      await result.current.loginWithWallet();
    });

    expect(toast.error).toHaveBeenCalledWith("Connection cancelled");
    expect(result.current.jwt).toBeNull();
    expect(result.current.isConnecting).toBe(false);
  });

  it("5. Assert no JWT is stored on any failure case (e.g. wallet access cancellation)", async () => {
    vi.mocked(Freighter.isConnected).mockResolvedValue(false);
    vi.mocked(Freighter.requestAccess).mockResolvedValue(""); // null or empty string indicating cancellation

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await act(async () => {
      await result.current.loginWithWallet();
    });

    expect(toast.error).toHaveBeenCalledWith("Connection cancelled");
    expect(result.current.jwt).toBeNull();
    expect(result.current.isConnecting).toBe(false);
  });

  it("5b. Assert no JWT is stored on challenge endpoint failure", async () => {
    vi.mocked(Freighter.isConnected).mockResolvedValue(true);
    vi.mocked(Freighter.getPublicKey).mockResolvedValue(mockAddress);

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith("/auth/challenge")) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ message: "Challenge endpoint error" }),
        } as Response);
      }
      return Promise.reject(new Error("Unexpected endpoint"));
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await act(async () => {
      await result.current.loginWithWallet();
    });

    expect(toast.error).toHaveBeenCalledWith("Challenge endpoint error");
    expect(result.current.jwt).toBeNull();
    expect(result.current.isConnecting).toBe(false);
  });
});
