import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RecentlyViewed } from "../recently-viewed";
import type { RecentlyViewedInvoice } from "@/lib/recentlyViewed";

const mockEntries: RecentlyViewedInvoice[] = [
  { id: "1", title: "Invoice A", status: "open", amount: 5000, viewedAt: "2026-07-29T00:00:00Z" },
  { id: "2", title: "Invoice B", status: "funded", amount: 10000, viewedAt: "2026-07-28T00:00:00Z" },
  { id: "3", title: "Invoice C", status: "settled", amount: 7500, viewedAt: "2026-07-27T00:00:00Z" },
];

describe("RecentlyViewed", () => {
  it("renders nothing when entries are empty", () => {
    const { container } = render(<RecentlyViewed entries={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders section heading", () => {
    render(<RecentlyViewed entries={mockEntries} />);
    expect(screen.getByText("Recently Viewed")).toBeInTheDocument();
  });

  it("renders invoice titles", () => {
    render(<RecentlyViewed entries={mockEntries} />);
    expect(screen.getByText("Invoice A")).toBeInTheDocument();
    expect(screen.getByText("Invoice B")).toBeInTheDocument();
    expect(screen.getByText("Invoice C")).toBeInTheDocument();
  });

  it("renders status badges", () => {
    render(<RecentlyViewed entries={mockEntries} />);
    expect(screen.getByText("open")).toBeInTheDocument();
    expect(screen.getByText("funded")).toBeInTheDocument();
    expect(screen.getByText("settled")).toBeInTheDocument();
  });

  it("renders face values", () => {
    render(<RecentlyViewed entries={mockEntries} />);
    expect(screen.getByText("5,000 XLM")).toBeInTheDocument();
    expect(screen.getByText("10,000 XLM")).toBeInTheDocument();
    expect(screen.getByText("7,500 XLM")).toBeInTheDocument();
  });

  it("links each card to the correct invoice detail page", () => {
    render(<RecentlyViewed entries={mockEntries} />);
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/marketplace/1");
    expect(links[1]).toHaveAttribute("href", "/marketplace/2");
    expect(links[2]).toHaveAttribute("href", "/marketplace/3");
  });
});
