import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RiskProfileQuestionnaire } from "../RiskProfileQuestionnaire";

function pick(label: RegExp) {
  fireEvent.click(screen.getByLabelText(label));
}

describe("RiskProfileQuestionnaire", () => {
  it("navigates with back/next and submits the computed tier", () => {
    const onComplete = vi.fn();
    render(<RiskProfileQuestionnaire onComplete={onComplete} />);

    const next = () => fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Question 1 of 4")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();

    pick(/Extensive/);
    next();
    expect(screen.getByText("Question 2 of 4")).toBeInTheDocument();

    // Back keeps the earlier answer.
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByLabelText(/Extensive/)).toBeChecked();
    next();

    pick(/Invest more/);
    next();
    pick(/More than 15%/);
    next();
    pick(/More than 12 months/);
    next();

    expect(screen.getByTestId("computed-tier")).toHaveTextContent("Aggressive");
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    expect(onComplete).toHaveBeenCalledWith("aggressive");
  });
});
