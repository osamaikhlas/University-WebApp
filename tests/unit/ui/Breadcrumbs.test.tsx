import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

describe("Breadcrumbs", () => {
  it("always includes a leading Home link", () => {
    render(<Breadcrumbs items={[{ label: "Faculty" }]} />);
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
  });

  it("marks the final item as the current page, not a link", () => {
    render(<Breadcrumbs items={[{ label: "Faculty" }]} />);
    const current = screen.getByText("Faculty");
    expect(current.tagName).toBe("SPAN");
    expect(current).toHaveAttribute("aria-current", "page");
  });

  it("renders intermediate items as links when given an href", () => {
    render(
      <Breadcrumbs
        items={[{ label: "Academics", href: "/academics" }, { label: "Programs" }]}
      />,
    );
    expect(screen.getByRole("link", { name: "Academics" })).toHaveAttribute(
      "href",
      "/academics",
    );
    expect(screen.getByText("Programs")).toHaveAttribute("aria-current", "page");
  });
});
