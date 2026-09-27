import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FaceValueInput } from "../FaceValueInput";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { MIN_INVOICE_FACE_VALUE } from "@/lib/validation/face-value";

function FaceValueFormHarness({ min = MIN_INVOICE_FACE_VALUE }: { min?: number }) {
  const [validAmount, setValidAmount] = useState<number | null>(null);

  return (
    <div>
      <FaceValueInput min={min} onValidAmountChange={setValidAmount} />
      <Button type="submit" disabled={validAmount === null}>
        Submit
      </Button>
    </div>
  );
}

describe("FaceValueInput", () => {
  const min = MIN_INVOICE_FACE_VALUE;

  it("shows 'Please enter a valid amount' for non-numeric input", () => {
    render(<FaceValueInput min={min} />);

    fireEvent.change(screen.getByLabelText("Face Value (XLM)"), {
      target: { value: "abc" },
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Please enter a valid amount");
  });

  it("shows 'Amount must be greater than zero' for zero", () => {
    render(<FaceValueInput min={min} />);

    fireEvent.change(screen.getByLabelText("Face Value (XLM)"), {
      target: { value: "0" },
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Amount must be greater than zero");
  });

  it("shows 'Amount below minimum invoice size' below the floor", () => {
    render(<FaceValueInput min={min} />);

    fireEvent.change(screen.getByLabelText("Face Value (XLM)"), {
      target: { value: String(min - 1) },
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Amount below minimum invoice size"
    );
  });

  it("shows no error and reports the amount for a valid value above the minimum", () => {
    const onValidAmountChange = vi.fn();
    render(<FaceValueInput min={min} onValidAmountChange={onValidAmountChange} />);

    fireEvent.change(screen.getByLabelText("Face Value (XLM)"), {
      target: { value: String(min + 100) },
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(onValidAmountChange).toHaveBeenLastCalledWith(min + 100);
  });

  it("disables the submit button while the input is invalid", () => {
    render(<FaceValueFormHarness min={min} />);

    const submit = screen.getByRole("button", { name: "Submit" });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Face Value (XLM)"), {
      target: { value: "abc" },
    });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Face Value (XLM)"), {
      target: { value: "0" },
    });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Face Value (XLM)"), {
      target: { value: String(min - 1) },
    });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Face Value (XLM)"), {
      target: { value: String(min + 50) },
    });
    expect(submit).not.toBeDisabled();
  });
});
