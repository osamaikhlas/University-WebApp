import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PagePlaceholder } from "@/components/PagePlaceholder";

describe("PagePlaceholder", () => {
  it("renders the title and description", () => {
    render(<PagePlaceholder title="Faculty" description="Faculty details." />);

    expect(screen.getByRole("heading", { name: "Faculty" })).toBeInTheDocument();
    expect(screen.getByText("Faculty details.")).toBeInTheDocument();
  });

  it("always marks itself as a placeholder (CLAUDE.md rule 14)", () => {
    render(<PagePlaceholder title="Faculty" description="Faculty details." />);

    expect(screen.getByText(/placeholder/i)).toBeInTheDocument();
  });

  it("renders the circular reference when provided", () => {
    render(
      <PagePlaceholder
        title="Faculty"
        description="Faculty details."
        circularReference="Item 4"
      />,
    );

    expect(screen.getByText(/Item 4/)).toBeInTheDocument();
  });
});
