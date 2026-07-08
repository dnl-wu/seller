import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MissingFields } from "./MissingFields.js";

describe("MissingFields", () => {
  it("renders backend-provided missing fields with human-readable labels", () => {
    render(<MissingFields missingFields={["size", "brand", "condition"]} />);

    expect(screen.getByText("Still needed")).toBeInTheDocument();
    expect(screen.getByText("Size")).toBeInTheDocument();
    expect(screen.getByText("Brand")).toBeInTheDocument();
    expect(screen.getByText("Condition")).toBeInTheDocument();
  });

  it("renders nothing when there are no missing fields", () => {
    const { container } = render(<MissingFields missingFields={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
