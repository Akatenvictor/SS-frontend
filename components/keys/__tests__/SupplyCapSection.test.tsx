import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SupplyCapSection } from "../SupplyCapSection";

describe("SupplyCapSection", () => {
  it("shows circulating supply, cap, remaining mintable, and progress", () => {
    render(
      <SupplyCapSection
        supply={{
          circulatingSupply: 75,
          supplyCap: 100,
          remainingMintable: 25,
        }}
      />
    );

    const progress = screen.getByTestId("supply-progress-bar");
    expect(screen.getByTestId("supply-section")).toBeInTheDocument();
    expect(screen.getByText("75")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByTestId("remaining-mintable")).toHaveTextContent("25");
    expect(progress).toHaveStyle({ width: "75%" });
    expect(progress).toHaveAttribute("aria-valuenow", "75");
  });

  it("shows a sold out badge when no keys remain", () => {
    render(
      <SupplyCapSection
        supply={{
          circulatingSupply: 100,
          supplyCap: 100,
          remainingMintable: 0,
        }}
      />
    );

    expect(screen.getByTestId("sold-out-badge")).toHaveTextContent("Sold Out");
    expect(screen.getByTestId("supply-progress-bar")).toHaveStyle({
      width: "100%",
    });
  });

  it("hides when supplyCap is null", () => {
    const { container } = render(
      <SupplyCapSection
        supply={{
          circulatingSupply: 10,
          supplyCap: null,
          remainingMintable: 0,
        }}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
