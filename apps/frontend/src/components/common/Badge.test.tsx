import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("renders children", () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("applies default variant by default", () => {
    const { container } = render(<Badge>Default</Badge>);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("accepts all valid variants without error", () => {
    const variants = ["default", "success", "warning", "destructive", "info"] as const;
    variants.forEach((variant) => {
      const { unmount } = render(<Badge variant={variant}>{variant}</Badge>);
      expect(screen.getByText(variant)).toBeInTheDocument();
      unmount();
    });
  });
});
