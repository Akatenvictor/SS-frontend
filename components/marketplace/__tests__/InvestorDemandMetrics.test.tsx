import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { InvestorDemandMetrics } from "../InvestorDemandMetrics";
import {
  DEMAND_METRICS_POLL_INTERVAL_MS,
} from "@/hooks/useInvoiceDemandMetrics";
import * as api from "@/lib/api";

const DAY = 24 * 60 * 60 * 1000;

/** An invoice funded comfortably over a day ago, so velocity is meaningful. */
const FUNDED_AT = new Date(Date.now() - 5 * DAY).toISOString();

function metrics(overrides: Partial<api.InvoiceDemandMetrics> = {}) {
  return {
    invoice_id: "inv-1",
    investor_count: 7,
    raised_last_24h: 0,
    raised: 10000,
    target: 10000,
    funded_at: FUNDED_AT,
    ...overrides,
  } as api.InvoiceDemandMetrics;
}

function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return { client, ...render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>) };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("investor count", () => {
  it("renders the count from the API", async () => {
    vi.spyOn(api, "fetchInvoiceDemandMetrics").mockResolvedValue(metrics({ investor_count: 12 }));
    renderWithClient(<InvestorDemandMetrics invoiceId="inv-1" />);

    await waitFor(() =>
      expect(screen.getByTestId("investor-count")).toHaveTextContent("12")
    );
  });

  it("labels the count for screen readers", async () => {
    vi.spyOn(api, "fetchInvoiceDemandMetrics").mockResolvedValue(metrics({ investor_count: 12 }));
    renderWithClient(<InvestorDemandMetrics invoiceId="inv-1" />);

    await waitFor(() =>
      expect(screen.getByTestId("investor-count")).toHaveAttribute(
        "aria-label",
        "12 investors"
      )
    );
  });

  it("falls back to the invoice's own count before the first poll lands", () => {
    vi.spyOn(api, "fetchInvoiceDemandMetrics").mockReturnValue(new Promise(() => {}));
    renderWithClient(
      <InvestorDemandMetrics invoiceId="inv-1" investorCountFallback={4} />
    );

    expect(screen.getByTestId("investor-count")).toHaveTextContent("4");
  });

  it("prefers the API count over the fallback once it arrives", async () => {
    vi.spyOn(api, "fetchInvoiceDemandMetrics").mockResolvedValue(metrics({ investor_count: 9 }));
    renderWithClient(
      <InvestorDemandMetrics invoiceId="inv-1" investorCountFallback={4} />
    );

    await waitFor(() =>
      expect(screen.getByTestId("investor-count")).toHaveTextContent("9")
    );
  });

  it("updates in place when a poll returns a new count, without remounting", async () => {
    const spy = vi
      .spyOn(api, "fetchInvoiceDemandMetrics")
      .mockResolvedValue(metrics({ investor_count: 3 }));
    const { client } = renderWithClient(<InvestorDemandMetrics invoiceId="inv-1" />);
    await screen.findByText("3");
    const element = screen.getByTestId("investor-count");

    spy.mockResolvedValue(metrics({ investor_count: 8 }));
    await client.invalidateQueries({ queryKey: ["invoice-demand-metrics", "inv-1"] });

    expect(await screen.findByText("8")).toBe(element);
  });
});

describe("velocity badge thresholds", () => {
  it("shows no badge before the first poll resolves, rather than a placeholder", () => {
    vi.spyOn(api, "fetchInvoiceDemandMetrics").mockReturnValue(new Promise(() => {}));
    renderWithClient(<InvestorDemandMetrics invoiceId="inv-1" />);

    // A "Slow" badge that flips to "Trending" reads as a real change, which is
    // the flicker the brief rules out.
    expect(screen.queryByTestId("velocity-badge")).not.toBeInTheDocument();
  });

  it("is trending above 10% raised in 24h", async () => {
    vi.spyOn(api, "fetchInvoiceDemandMetrics").mockResolvedValue(
      metrics({ raised_last_24h: 2500, raised: 10000 })
    );
    renderWithClient(<InvestorDemandMetrics invoiceId="inv-1" />);

    const badge = await screen.findByTestId("velocity-badge");
    expect(badge).toHaveAttribute("data-velocity", "trending");
    expect(badge).toHaveTextContent("Trending");
  });

  it("is steady between 1% and 10%", async () => {
    vi.spyOn(api, "fetchInvoiceDemandMetrics").mockResolvedValue(
      metrics({ raised_last_24h: 500, raised: 10000 })
    );
    renderWithClient(<InvestorDemandMetrics invoiceId="inv-1" />);

    expect(await screen.findByTestId("velocity-badge")).toHaveAttribute(
      "data-velocity",
      "steady"
    );
  });

  it("is slow below 1%", async () => {
    vi.spyOn(api, "fetchInvoiceDemandMetrics").mockResolvedValue(
      metrics({ raised_last_24h: 50, raised: 10000 })
    );
    renderWithClient(<InvestorDemandMetrics invoiceId="inv-1" />);

    expect(await screen.findByTestId("velocity-badge")).toHaveAttribute(
      "data-velocity",
      "slow"
    );
  });
});

describe("velocity colour coding", () => {
  it("renders trending in green", async () => {
    vi.spyOn(api, "fetchInvoiceDemandMetrics").mockResolvedValue(
      metrics({ raised_last_24h: 2500, raised: 10000 })
    );
    renderWithClient(<InvestorDemandMetrics invoiceId="inv-1" />);

    expect(await screen.findByTestId("velocity-badge")).toHaveClass("border-green-500/40");
  });

  it("renders steady in amber", async () => {
    vi.spyOn(api, "fetchInvoiceDemandMetrics").mockResolvedValue(
      metrics({ raised_last_24h: 500, raised: 10000 })
    );
    renderWithClient(<InvestorDemandMetrics invoiceId="inv-1" />);

    expect(await screen.findByTestId("velocity-badge")).toHaveClass("border-amber-500/40");
  });

  it("renders slow in grey", async () => {
    vi.spyOn(api, "fetchInvoiceDemandMetrics").mockResolvedValue(
      metrics({ raised_last_24h: 50, raised: 10000 })
    );
    renderWithClient(<InvestorDemandMetrics invoiceId="inv-1" />);

    expect(await screen.findByTestId("velocity-badge")).toHaveClass("bg-muted/50");
  });
});

describe("velocity suppression", () => {
  it("hides the badge for an invoice funded less than 24h ago", async () => {
    vi.spyOn(api, "fetchInvoiceDemandMetrics").mockResolvedValue(
      metrics({
        raised_last_24h: 9000,
        raised: 10000,
        funded_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      })
    );
    renderWithClient(<InvestorDemandMetrics invoiceId="inv-1" />);

    // Even at 90% in a day, a part-day is not a 24h rate and must not be shown
    // as one. The count still appears.
    await screen.findByText("7");
    expect(screen.queryByTestId("velocity-badge")).not.toBeInTheDocument();
  });

  it("hides the badge for a still-open invoice", async () => {
    vi.spyOn(api, "fetchInvoiceDemandMetrics").mockResolvedValue(
      metrics({ raised_last_24h: 2500, raised: 10000, funded_at: null })
    );
    renderWithClient(<InvestorDemandMetrics invoiceId="inv-1" />);

    await screen.findByText("7");
    expect(screen.queryByTestId("velocity-badge")).not.toBeInTheDocument();
  });

  it("still shows the count when the badge is suppressed", async () => {
    vi.spyOn(api, "fetchInvoiceDemandMetrics").mockResolvedValue(
      metrics({ investor_count: 42, funded_at: null })
    );
    renderWithClient(<InvestorDemandMetrics invoiceId="inv-1" />);

    await waitFor(() =>
      expect(screen.getByTestId("investor-count")).toHaveTextContent("42")
    );
  });
});

describe("polling", () => {
  it("refreshes both metrics on a 60 second cadence", () => {
    expect(DEMAND_METRICS_POLL_INTERVAL_MS).toBe(60_000);
  });

  it("requests the metrics for the given invoice", async () => {
    const spy = vi
      .spyOn(api, "fetchInvoiceDemandMetrics")
      .mockResolvedValue(metrics());
    renderWithClient(<InvestorDemandMetrics invoiceId="inv-9" />);

    await waitFor(() => expect(spy).toHaveBeenCalledWith("inv-9"));
  });

  it("keeps the previous payload through a refetch, so nothing unmounts", async () => {
    const spy = vi.spyOn(api, "fetchInvoiceDemandMetrics").mockResolvedValue(metrics());
    const { client } = renderWithClient(<InvestorDemandMetrics invoiceId="inv-1" />);
    await screen.findByText("7");

    // A refetch in flight must not blank the count — `placeholderData` carries
    // the last good value through, which is what prevents the 60s flicker.
    let release: (v: api.InvoiceDemandMetrics) => void = () => {};
    spy.mockReturnValue(
      new Promise<api.InvoiceDemandMetrics>((resolve) => {
        release = resolve;
      })
    );
    void client.refetchQueries({ queryKey: ["invoice-demand-metrics", "inv-1"] });

    expect(screen.getByTestId("investor-count")).toHaveTextContent("7");
    release(metrics({ investor_count: 7 }));
  });
});

describe("error handling", () => {
  it("keeps the fallback count when the metrics request fails", async () => {
    vi.spyOn(api, "fetchInvoiceDemandMetrics").mockRejectedValue(new Error("offline"));
    renderWithClient(
      <InvestorDemandMetrics invoiceId="inv-1" investorCountFallback={5} />
    );

    await waitFor(() =>
      expect(screen.getByTestId("investor-count")).toHaveTextContent("5")
    );
    expect(screen.queryByTestId("velocity-badge")).not.toBeInTheDocument();
  });

  it("does not throw when there is no fallback and the request fails", async () => {
    vi.spyOn(api, "fetchInvoiceDemandMetrics").mockRejectedValue(new Error("offline"));
    renderWithClient(<InvestorDemandMetrics invoiceId="inv-1" />);

    await waitFor(() =>
      expect(screen.getByTestId("investor-count")).toHaveTextContent("0")
    );
  });
});
