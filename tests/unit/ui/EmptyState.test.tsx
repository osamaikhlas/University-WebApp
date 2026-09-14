import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "@/components/ui/EmptyState";

describe("EmptyState", () => {
  it("renders the title and optional description", () => {
    render(<EmptyState title="No notices yet." description="Check back later." />);
    expect(screen.getByText("No notices yet.")).toBeInTheDocument();
    expect(screen.getByText("Check back later.")).toBeInTheDocument();
  });

  it("renders without a description", () => {
    render(<EmptyState title="Nothing here." />);
    expect(screen.getByText("Nothing here.")).toBeInTheDocument();
  });

  it("renders an optional action", () => {
    render(<EmptyState title="Nothing here." action={<button>Retry</button>} />);
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
