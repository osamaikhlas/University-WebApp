import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Alert } from "@/components/ui/Alert";

describe("Alert", () => {
  it("uses role=alert (assertive) for danger and warning tones", () => {
    const { rerender } = render(<Alert tone="danger">Something went wrong.</Alert>);
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong.");

    rerender(<Alert tone="warning">Careful.</Alert>);
    expect(screen.getByRole("alert")).toHaveTextContent("Careful.");
  });

  it("uses role=status (polite) for info and success tones", () => {
    const { rerender } = render(<Alert tone="info">FYI.</Alert>);
    expect(screen.getByRole("status")).toHaveTextContent("FYI.");

    rerender(<Alert tone="success">Done.</Alert>);
    expect(screen.getByRole("status")).toHaveTextContent("Done.");
  });

  it("renders an optional title", () => {
    render(
      <Alert tone="info" title="Heads up">
        Body text.
      </Alert>,
    );
    expect(screen.getByText("Heads up")).toBeInTheDocument();
  });
});
