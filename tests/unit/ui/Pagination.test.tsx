import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Pagination } from "@/components/ui/Pagination";

describe("Pagination", () => {
  it("renders nothing when there is only one page", () => {
    const { container } = render(
      <Pagination basePath="/search" searchParams={{}} page={1} totalPages={1} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders page links and marks the current page", () => {
    render(<Pagination basePath="/search" searchParams={{}} page={2} totalPages={3} />);
    const current = screen.getByRole("link", { name: "2" });
    expect(current).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "1" })).toHaveAttribute("href", "/search");
    expect(screen.getByRole("link", { name: "3" })).toHaveAttribute("href", "/search?page=3");
  });

  it("preserves other search params (e.g. q, category) on every page link", () => {
    render(
      <Pagination
        basePath="/search"
        searchParams={{ q: "sample", category: "notices" }}
        page={1}
        totalPages={2}
      />,
    );
    const next = screen.getByRole("link", { name: /next/i });
    expect(next).toHaveAttribute("href", "/search?q=sample&category=notices&page=2");
  });

  it("disables Previous on the first page and Next on the last page", () => {
    render(<Pagination basePath="/search" searchParams={{}} page={1} totalPages={2} />);
    expect(screen.getByRole("link", { name: /previous/i })).toHaveAttribute("aria-disabled", "true");

    render(<Pagination basePath="/search" searchParams={{}} page={2} totalPages={2} />);
    expect(screen.getAllByRole("link", { name: /next/i }).at(-1)).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
});
