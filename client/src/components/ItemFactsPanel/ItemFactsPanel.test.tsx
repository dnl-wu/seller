import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ItemFactsPanel } from "./ItemFactsPanel.js";

describe("ItemFactsPanel", () => {
  it("renders known attribute values", () => {
    render(
      <ItemFactsPanel
        attributes={{ category: "clothing", brand: "nike", originalPrice: 100 }}
        changedFields={new Set()}
      />,
    );

    expect(screen.getByText("clothing")).toBeInTheDocument();
    expect(screen.getByText("nike")).toBeInTheDocument();
    expect(screen.getByText("$100.00")).toBeInTheDocument();
  });

  it("renders 'Not provided' for unknown optional fields", () => {
    render(<ItemFactsPanel attributes={{ category: "clothing" }} changedFields={new Set()} />);

    expect(screen.getAllByText("Not provided").length).toBeGreaterThan(0);
  });

  it("formats defects arrays as a clean joined string", () => {
    render(
      <ItemFactsPanel
        attributes={{ defects: ["small stain", "loose button"] }}
        changedFields={new Set()}
      />,
    );

    expect(screen.getByText("small stain, loose button")).toBeInTheDocument();
  });

  it("never renders a raw object", () => {
    const { container } = render(
      <ItemFactsPanel attributes={{ category: "clothing" }} changedFields={new Set()} />,
    );

    expect(container.textContent).not.toContain("[object Object]");
  });
});
