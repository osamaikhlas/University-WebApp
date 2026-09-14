import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataTable } from "@/components/ui/Table";

type Row = { id: string; name: string };

describe("DataTable", () => {
  it("renders an empty state instead of an empty table when there are no rows", () => {
    render(
      <DataTable<Row>
        caption="People"
        rows={[]}
        getRowKey={(row) => row.id}
        emptyState={{ title: "No people yet." }}
        columns={[{ key: "name", header: "Name", render: (row) => row.name }]}
      />,
    );

    expect(screen.getByText("No people yet.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders a real accessible table with column headers and row data", () => {
    render(
      <DataTable<Row>
        caption="People"
        rows={[{ id: "1", name: "Ada" }, { id: "2", name: "Grace" }]}
        getRowKey={(row) => row.id}
        emptyState={{ title: "No people yet." }}
        columns={[{ key: "name", header: "Name", render: (row) => row.name }]}
      />,
    );

    const table = screen.getByRole("table", { name: "People" });
    expect(table).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.getByText("Grace")).toBeInTheDocument();
  });
});
