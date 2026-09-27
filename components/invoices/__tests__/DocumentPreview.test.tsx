import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { DocumentPreview } from "../DocumentPreview";

vi.mock("@/lib/logger", () => ({
  logError: vi.fn(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("DocumentPreview", () => {
  beforeEach(() => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-object-url");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("shows 'No document attached' when documentUrl is null", () => {
    render(<DocumentPreview documentUrl={null} />, { wrapper: createWrapper() });
    expect(screen.getByText("No document attached")).toBeInTheDocument();
  });

  it("shows loading skeleton while fetching", () => {
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));
    render(<DocumentPreview documentUrl="https://ipfs.example.com/doc.pdf" />, {
      wrapper: createWrapper(),
    });
    expect(screen.queryByText("No document attached")).not.toBeInTheDocument();
  });

  it("renders View Document link on successful fetch", async () => {
    const blob = new Blob(["test"], { type: "application/pdf" });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(blob),
    });

    await act(async () => {
      render(<DocumentPreview documentUrl="https://ipfs.example.com/doc.pdf" />, {
        wrapper: createWrapper(),
      });
    });

    await waitFor(() => {
      expect(screen.getByText("View Document")).toBeInTheDocument();
    });

    const link = screen.getByText("View Document");
    expect(link).toHaveAttribute("href", "blob:mock-object-url");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("shows download link fallback when fetch fails (timeout/error)", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    await act(async () => {
      render(<DocumentPreview documentUrl="https://ipfs.example.com/doc.pdf" />, {
        wrapper: createWrapper(),
      });
    });

    await waitFor(
      () => {
        expect(screen.getByText("Download directly")).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    const link = screen.getByText("Download directly");
    expect(link).toHaveAttribute("href", "https://ipfs.example.com/doc.pdf");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("shows download link fallback when fetch returns 404", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    await act(async () => {
      render(<DocumentPreview documentUrl="https://ipfs.example.com/doc.pdf" />, {
        wrapper: createWrapper(),
      });
    });

    await waitFor(
      () => {
        expect(screen.getByText("Download directly")).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it("shows 'Document preview unavailable' in fallback", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Timeout"));

    await act(async () => {
      render(<DocumentPreview documentUrl="https://ipfs.example.com/doc.pdf" />, {
        wrapper: createWrapper(),
      });
    });

    await waitFor(
      () => {
        expect(screen.getByText("Document preview unavailable")).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it("download link opens raw IPFS URL in new tab", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Timeout"));

    await act(async () => {
      render(
        <DocumentPreview documentUrl="https://ipfs.io/ipfs/Qm123abc/document.pdf" />,
        { wrapper: createWrapper() }
      );
    });

    await waitFor(
      () => {
        const link = screen.getByText("Download directly");
        expect(link).toHaveAttribute("href", "https://ipfs.io/ipfs/Qm123abc/document.pdf");
        expect(link).toHaveAttribute("target", "_blank");
      },
      { timeout: 5000 }
    );
  });

  it("shows Retry button in fallback", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Timeout"));

    await act(async () => {
      render(<DocumentPreview documentUrl="https://ipfs.example.com/doc.pdf" />, {
        wrapper: createWrapper(),
      });
    });

    await waitFor(
      () => {
        expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });

  it("removes loading spinner after fetch completes (success or error)", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Timeout"));

    const { container } = await act(async () => {
      return render(
        <DocumentPreview documentUrl="https://ipfs.example.com/doc.pdf" />,
        { wrapper: createWrapper() }
      );
    });

    await waitFor(
      () => {
        expect(screen.getByText("Download directly")).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBe(0);
  });
});
