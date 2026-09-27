import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppErrorBoundary } from "../ErrorBoundary";

vi.mock("@/lib/logger", () => ({
  logError: vi.fn(),
}));

vi.mock("@/components/layout/GoToMarketplaceButton", () => ({
  GoToMarketplaceButton: () => <button type="button">Back to marketplace</button>,
}));

function Bomb(): never {
  throw new Error("render explosion");
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AppErrorBoundary", () => {
  it("renders children when no error is thrown", () => {
    render(
      <AppErrorBoundary>
        <div>healthy content</div>
      </AppErrorBoundary>
    );

    expect(screen.getByText("healthy content")).toBeInTheDocument();
    expect(screen.queryByTestId("error-boundary-fallback")).not.toBeInTheDocument();
  });

  it("catches render errors and shows the fallback UI", () => {
    render(
      <AppErrorBoundary>
        <Bomb />
      </AppErrorBoundary>
    );

    expect(screen.getByTestId("error-boundary-fallback")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.queryByText("healthy content")).not.toBeInTheDocument();
  });

  it("offers a refresh action on the fallback", () => {
    render(
      <AppErrorBoundary>
        <Bomb />
      </AppErrorBoundary>
    );

    expect(screen.getByTestId("error-boundary-refresh")).toBeInTheDocument();
  });

  it("reloads the page when refresh is clicked", () => {
    const reloadSpy = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload: reloadSpy },
    });

    render(
      <AppErrorBoundary>
        <Bomb />
      </AppErrorBoundary>
    );

    fireEvent.click(screen.getByTestId("error-boundary-refresh"));

    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });
});
