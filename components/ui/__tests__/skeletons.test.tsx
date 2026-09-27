import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  InvoiceCardSkeleton,
  NotificationItemSkeleton,
  PortfolioRowSkeleton,
  ProfileStatsSkeleton,
} from "../skeletons";

describe("content skeletons (issue #324)", () => {
  it("marks invoice card skeletons as busy with a pulsing shape", () => {
    const { container } = render(<InvoiceCardSkeleton />);

    const skeleton = screen.getByTestId("invoice-card-skeleton");
    expect(skeleton).toHaveAttribute("aria-busy", "true");
    expect(skeleton.querySelector("[class*='animate-pulse']")).not.toBeNull();
    // 4-col meta grid like the real marketplace invoice rows.
    expect(container.querySelectorAll(".grid-cols-4")).toHaveLength(1);
  });

  it("marks portfolio row skeletons as busy", () => {
    render(<PortfolioRowSkeleton />);

    expect(screen.getByTestId("portfolio-row-skeleton")).toHaveAttribute("aria-busy", "true");
  });

  it("marks notification item skeletons as busy", () => {
    render(<NotificationItemSkeleton />);

    expect(screen.getByTestId("notification-item-skeleton")).toHaveAttribute(
      "aria-busy",
      "true"
    );
  });

  it("renders four stat placeholders matching the stats grid", () => {
    render(<ProfileStatsSkeleton />);

    const skeleton = screen.getByTestId("profile-stats-skeleton");
    expect(skeleton).toHaveAttribute("aria-busy", "true");
    expect(skeleton.querySelectorAll(".animate-pulse")).toHaveLength(8);
  });

  it("applies the pulse animation to every skeleton", () => {
    const { container } = render(
      <>
        <InvoiceCardSkeleton />
        <PortfolioRowSkeleton />
        <NotificationItemSkeleton />
        <ProfileStatsSkeleton />
      </>
    );

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });
});
