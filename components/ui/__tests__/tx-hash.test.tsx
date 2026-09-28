import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { TxHash, stellarExplorerTxUrl, DEFAULT_NETWORK } from "@/components/ui/tx-hash";

const HASH =
  "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2";

describe("stellarExplorerTxUrl", () => {
  it("uses the public path segment for mainnet", () => {
    expect(stellarExplorerTxUrl(HASH, "mainnet")).toBe(
      `https://stellar.expert/explorer/public/tx/${HASH}`
    );
  });

  it("uses the testnet path segment for testnet", () => {
    expect(stellarExplorerTxUrl(HASH, "testnet")).toBe(
      `https://stellar.expert/explorer/testnet/tx/${HASH}`
    );
  });

  it("defaults to the configured network", () => {
    expect(stellarExplorerTxUrl(HASH)).toBe(
      stellarExplorerTxUrl(HASH, DEFAULT_NETWORK)
    );
  });
});

describe("TxHash", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("truncates to first 6 and last 4 characters with an ellipsis", () => {
    render(<TxHash hash={HASH} />);
    expect(screen.getByTestId("tx-hash-display")).toHaveTextContent(
      `${HASH.slice(0, 6)}…${HASH.slice(-4)}`
    );
  });

  it("renders a hash too short to truncate in full", () => {
    render(<TxHash hash="abc123" />);
    expect(screen.getByTestId("tx-hash-display")).toHaveTextContent("abc123");
  });

  it("renders a hash exactly at the truncation boundary in full", () => {
    const short = "12345678901"; // 11 chars, start+end+1 = 11
    render(<TxHash hash={short} />);
    expect(screen.getByTestId("tx-hash-display")).toHaveTextContent(short);
  });

  it("copies the full hash on click, not the truncated display", async () => {
    render(<TxHash hash={HASH} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("tx-hash-display"));
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(HASH);
  });

  it("shows copied feedback, then clears it after 2 seconds", async () => {
    render(<TxHash hash={HASH} />);
    const display = screen.getByTestId("tx-hash-display");
    await act(async () => {
      fireEvent.click(display);
    });
    expect(
      screen.getByRole("button", { name: "Copied to clipboard" })
    ).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(
      screen.getByRole("button", { name: "Copy transaction hash" })
    ).toBeInTheDocument();
  });

  it("links to the explorer for the given network in a new tab", () => {
    render(<TxHash hash={HASH} network="testnet" />);
    const link = screen.getByTestId("tx-hash-explorer-link");
    expect(link).toHaveAttribute(
      "href",
      `https://stellar.expert/explorer/testnet/tx/${HASH}`
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("falls back to execCommand when the Clipboard API is unavailable", async () => {
    // Non-secure context: `navigator.clipboard` is simply absent.
    // @ts-expect-error deliberately removing the API
    delete navigator.clipboard;
    const execCommand = vi.fn().mockReturnValue(true);
    Object.assign(document, { execCommand });

    render(<TxHash hash={HASH} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("tx-hash-display"));
    });
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(
      screen.getByRole("button", { name: "Copied to clipboard" })
    ).toBeInTheDocument();
  });
});
