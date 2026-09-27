import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InvestmentAmountInput } from "../InvestmentAmountInput";

describe("InvestmentAmountInput", () => {
    const min = 100;
    const max = 5000;

    it("shows an inline error when the amount is below the minimum", () => {
        render(<InvestmentAmountInput min={min} max={max} />);

        fireEvent.change(screen.getByLabelText("Investment amount (XLM)"), {
            target: { value: "50" },
        });

        expect(screen.getByRole("alert")).toHaveTextContent(`Minimum investment is ${min} XLM`);
    });

    it("shows an inline error when the amount exceeds available capacity", () => {
        render(<InvestmentAmountInput min={min} max={max} />);

        fireEvent.change(screen.getByLabelText("Investment amount (XLM)"), {
            target: { value: "5001" },
        });

        expect(screen.getByRole("alert")).toHaveTextContent("Amount exceeds available capacity");
    });

    it("shows no error and reports the valid amount for a value within range", () => {
        const onValidAmountChange = vi.fn();
        render(
            <InvestmentAmountInput min={min} max={max} onValidAmountChange={onValidAmountChange} />
        );

        fireEvent.change(screen.getByLabelText("Investment amount (XLM)"), {
            target: { value: "2500" },
        });

        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(onValidAmountChange).toHaveBeenLastCalledWith(2500);
    });

    it("shows a validation error for a non-numeric value", () => {
        render(<InvestmentAmountInput min={min} max={max} />);

        fireEvent.change(screen.getByLabelText("Investment amount (XLM)"), {
            target: { value: "abc" },
        });

        expect(screen.getByRole("alert")).toHaveTextContent("Please enter a valid amount");
    });

    it("clears the error when the field is emptied", () => {
        render(<InvestmentAmountInput min={min} max={max} />);
        const input = screen.getByLabelText("Investment amount (XLM)");

        fireEvent.change(input, { target: { value: "50" } });
        expect(screen.getByRole("alert")).toBeInTheDocument();

        fireEvent.change(input, { target: { value: "" } });
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
});
