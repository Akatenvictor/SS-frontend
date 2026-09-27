import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { HelpCentre } from "../HelpCentre";

describe("HelpCentre", () => {
  it("groups articles by category", () => {
    render(<HelpCentre />);

    const investorsGroup = screen.getByRole("region", { name: "For investors" });
    const sellersGroup = screen.getByRole("region", { name: "For sellers" });
    const platformGroup = screen.getByRole("region", { name: "Platform" });
    const technicalGroup = screen.getByRole("region", { name: "Technical" });

    expect(
      within(investorsGroup).getAllByRole("button", { name: /how do i invest in an invoice/i })
    ).toHaveLength(1);
    expect(
      within(sellersGroup).getAllByRole("button", { name: /publish an invoice/i })
    ).toHaveLength(1);
    expect(
      within(platformGroup).getAllByRole("button", { name: /which wallet can i use/i })
    ).toHaveLength(1);
    expect(
      within(technicalGroup).getAllByRole("button", { name: /transaction failing/i })
    ).toHaveLength(1);
  });

  it("collapses articles until clicked, then expands and collapses", () => {
    render(<HelpCentre />);

    const toggle = screen.getByTestId("help-article-toggle-invest-invoice");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("help-article-body-invest-invoice")).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("help-article-body-invest-invoice")).toHaveTextContent(
      "choose an open invoice and click Invest"
    );

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("help-article-body-invest-invoice")).not.toBeInTheDocument();
  });

  it("shows the top 5 most viewed articles at the top", () => {
    render(<HelpCentre />);

    const mostViewed = screen.getByTestId("help-most-viewed");
    const titles = within(mostViewed)
      .getAllByRole("button")
      .map((button) => button.textContent);

    expect(titles).toEqual([
      "How do I publish an invoice?",
      "How do I invest in an invoice?",
      "Why can't I connect my wallet?",
      "Which wallet can I use?",
      "When do I receive my returns?",
    ]);
  });

  it("shows a visible support contact link", () => {
    render(<HelpCentre />);

    const link = screen.getByTestId("help-support-link");
    expect(link).toHaveAttribute("href", "mailto:support@stellarsettle.com");
    expect(link).toHaveTextContent("Contact support");
  });

  it("filters articles by keyword across title and body", () => {
    render(<HelpCentre />);

    fireEvent.change(screen.getByTestId("help-search"), {
      target: { value: "deadline" },
    });

    expect(screen.getByTestId("help-article-toggle-seller-deadline")).toBeInTheDocument();
    expect(
      screen.queryByTestId("help-article-toggle-invest-invoice")
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("help-most-viewed")).not.toBeInTheDocument();
  });

  it("shows an empty state when no article matches the search", () => {
    render(<HelpCentre />);

    fireEvent.change(screen.getByTestId("help-search"), {
      target: { value: "quantum blockchain" },
    });

    expect(screen.getByTestId("help-no-results")).toBeInTheDocument();
    expect(screen.queryByTestId("help-article-toggle-invest-invoice")).not.toBeInTheDocument();
  });
});
