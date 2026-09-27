import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";

describe("InvoiceStatusBadge", () => {
    it("renders grey badge with label 'Draft' for draft status", () => {
        render(<InvoiceStatusBadge status="draft" />);
        const badge = screen.getByText("Draft");
        expect(badge).toBeInTheDocument();
        expect(badge.closest("[data-slot='badge']")).toHaveAttribute("data-variant", "secondary");
    });

    it("renders blue badge with label 'Open' for published status", () => {
        render(<InvoiceStatusBadge status="published" />);
        const badge = screen.getByText("Open");
        expect(badge).toBeInTheDocument();
        expect(badge.closest("[data-slot='badge']")).toHaveAttribute("data-variant", "outline");
    });

    it("renders blue badge with label 'Open' for open status", () => {
        render(<InvoiceStatusBadge status="open" />);
        const badge = screen.getByText("Open");
        expect(badge).toBeInTheDocument();
        expect(badge.closest("[data-slot='badge']")).toHaveAttribute("data-variant", "outline");
    });

    it("renders yellow badge with label 'Funded' for funded status", () => {
        render(<InvoiceStatusBadge status="funded" />);
        const badge = screen.getByText("Funded");
        expect(badge).toBeInTheDocument();
        expect(badge.closest("[data-slot='badge']")).toHaveAttribute("data-variant", "default");
    });

    it("renders green badge with label 'Settled' for settled status", () => {
        render(<InvoiceStatusBadge status="settled" />);
        const badge = screen.getByText("Settled");
        expect(badge).toBeInTheDocument();
        expect(badge.closest("[data-slot='badge']")).toHaveAttribute("data-variant", "ghost");
    });

    it("renders red badge with label 'Expired' for expired status", () => {
        render(<InvoiceStatusBadge status="expired" />);
        const badge = screen.getByText("Expired");
        expect(badge).toBeInTheDocument();
        expect(badge.closest("[data-slot='badge']")).toHaveAttribute("data-variant", "destructive");
    });

    it("renders grey badge with label 'Unknown' for an unknown status", () => {
        render(<InvoiceStatusBadge status="unknown_status" />);
        const badge = screen.getByText("Unknown");
        expect(badge).toBeInTheDocument();
        expect(badge.closest("[data-slot='badge']")).toHaveAttribute("data-variant", "secondary");
    });

    it("returns null when status is null", () => {
        const { container } = render(<InvoiceStatusBadge status={null} />);
        expect(container.innerHTML).toBe("");
    });

    it("returns null when status is undefined", () => {
        const { container } = render(<InvoiceStatusBadge status={undefined} />);
        expect(container.innerHTML).toBe("");
    });

    it("does not throw when no status prop is provided", () => {
        const { container } = render(<InvoiceStatusBadge />);
        expect(container.innerHTML).toBe("");
    });
});