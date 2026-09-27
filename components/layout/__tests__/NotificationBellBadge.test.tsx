import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NotificationBellBadge } from "../NotificationBellBadge";

describe("NotificationBellBadge", () => {
  it("renders the bell icon without crashing", () => {
    const { container } = render(<NotificationBellBadge unreadCount={0} />);

    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("displays correct count for 5 unread", () => {
    render(<NotificationBellBadge unreadCount={5} />);

    const badge = screen.getByTestId("notification-badge");
    expect(badge).toHaveTextContent("5");
  });

  it("displays correct count for 99 unread", () => {
    render(<NotificationBellBadge unreadCount={99} />);

    const badge = screen.getByTestId("notification-badge");
    expect(badge).toHaveTextContent("99");
  });

  it("displays 99+ for count of 100", () => {
    render(<NotificationBellBadge unreadCount={100} />);

    const badge = screen.getByTestId("notification-badge");
    expect(badge).toHaveTextContent("99+");
  });

  it("displays 99+ for count greater than 100", () => {
    render(<NotificationBellBadge unreadCount={150} />);

    const badge = screen.getByTestId("notification-badge");
    expect(badge).toHaveTextContent("99+");
  });

  it("does not render badge when count is 0", () => {
    render(<NotificationBellBadge unreadCount={0} />);

    expect(screen.queryByTestId("notification-badge")).not.toBeInTheDocument();
  });

  it("does not render badge when count is null", () => {
    render(<NotificationBellBadge unreadCount={null} />);

    expect(screen.queryByTestId("notification-badge")).not.toBeInTheDocument();
  });
});
