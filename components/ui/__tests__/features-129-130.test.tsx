import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeatureComponent129, FeatureComponent130 } from "@/components/ui/button";
import { helperFunction129, helperFunction130 } from "@/lib/utils";

describe("FeatureComponent129 & helperFunction129 (#256)", () => {
  it("renders FeatureComponent129 with default label", () => {
    render(<FeatureComponent129 />);
    expect(screen.getByTestId("feature-component-129")).toHaveTextContent("New Feature 129");
  });

  it("renders FeatureComponent129 with custom label", () => {
    render(<FeatureComponent129 label="Custom Scalable Feature 129" />);
    expect(screen.getByTestId("feature-component-129")).toHaveTextContent("Custom Scalable Feature 129");
  });

  it("processes input correctly with helperFunction129", () => {
    expect(helperFunction129("  hello   world  ")).toBe("hello world");
    expect(helperFunction129(null)).toBe("");
    expect(helperFunction129(undefined)).toBe("");
    expect(helperFunction129(123)).toBe("");
  });
});

describe("FeatureComponent130 & helperFunction130 (#257)", () => {
  it("renders FeatureComponent130 with default label", () => {
    render(<FeatureComponent130 />);
    expect(screen.getByTestId("feature-component-130")).toHaveTextContent("New Feature 130");
  });

  it("renders FeatureComponent130 with custom label", () => {
    render(<FeatureComponent130 label="Custom Scalable Feature 130" />);
    expect(screen.getByTestId("feature-component-130")).toHaveTextContent("Custom Scalable Feature 130");
  });

  it("processes input correctly with helperFunction130", () => {
    expect(helperFunction130("  scalable   architecture  ")).toBe("scalable architecture");
    expect(helperFunction130(null)).toBe("");
    expect(helperFunction130(undefined)).toBe("");
    expect(helperFunction130(456)).toBe("");
  });
});
