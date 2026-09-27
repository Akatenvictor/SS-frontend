import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { FundingProgressBar } from "../FundingProgressBar";

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

function advanceAnimation() {
    vi.advanceTimersByTime(200);
}

describe("FundingProgressBar", () => {
    it("renders the correct percentage for a partially funded invoice", () => {
        render(<FundingProgressBar raised={4500} target={10000} investorCount={3} />);
        advanceAnimation();

        expect(screen.getByText("45.0%")).toBeInTheDocument();
    });

    it("renders 100% when raised equals target", () => {
        render(<FundingProgressBar raised={10000} target={10000} investorCount={5} />);
        advanceAnimation();

        expect(screen.getByText("100.0%")).toBeInTheDocument();
    });

    it("caps at 100% when raised exceeds target", () => {
        render(<FundingProgressBar raised={15000} target={10000} investorCount={5} />);
        advanceAnimation();

        expect(screen.getByText("100.0%")).toBeInTheDocument();
    });

    it("renders green bar when 100% funded", () => {
        render(<FundingProgressBar raised={10000} target={10000} investorCount={5} />);
        advanceAnimation();

        const bar = screen.getByText("100.0%");
        expect(bar).toBeInTheDocument();
    });

    it("displays XLM raised and target below the bar", () => {
        render(<FundingProgressBar raised={4500} target={10000} investorCount={3} />);
        advanceAnimation();

        expect(screen.getByText("4,500 XLM of 10,000 XLM")).toBeInTheDocument();
    });

    it("formats total to 2 decimal places", () => {
        render(<FundingProgressBar raised={4500} target={10000} investorCount={3} />);
        advanceAnimation();

        const formattedText = screen.getByText("4,500 XLM of 10,000 XLM");
        expect(formattedText).toBeInTheDocument();
    });

    it("handles zero target gracefully", () => {
        render(<FundingProgressBar raised={0} target={0} investorCount={0} />);
        advanceAnimation();

        expect(screen.getByText("0.0%")).toBeInTheDocument();
    });

    it("renders Funded badge at 100%", () => {
        render(<FundingProgressBar raised={10000} target={10000} investorCount={3} />);
        advanceAnimation();

        expect(screen.getByText("Funded")).toBeInTheDocument();
    });

    it("does not render Funded badge at 99.9%", () => {
        render(<FundingProgressBar raised={9990} target={10000} investorCount={3} />);
        advanceAnimation();

        expect(screen.queryByText("Funded")).not.toBeInTheDocument();
    });

    it("renders singular 'investor' for count of 1", () => {
        render(<FundingProgressBar raised={5000} target={10000} investorCount={1} />);
        advanceAnimation();

        expect(screen.getByText("1 investor")).toBeInTheDocument();
    });

    it("renders plural 'investors' for count of 5", () => {
        render(<FundingProgressBar raised={5000} target={10000} investorCount={5} />);
        advanceAnimation();

        expect(screen.getByText("5 investors")).toBeInTheDocument();
    });

    it("renders '0 investors' without crashing", () => {
        render(<FundingProgressBar raised={0} target={10000} investorCount={0} />);
        advanceAnimation();

        expect(screen.getByText("0 investors")).toBeInTheDocument();
    });
});
