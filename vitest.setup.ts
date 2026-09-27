import "@testing-library/jest-dom/vitest";

// jsdom does not implement ResizeObserver, which recharts' ResponsiveContainer
// subscribes to on mount.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
