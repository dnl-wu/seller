import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ListingPreview } from "./ListingPreview.js";
import { makeListingDraft } from "../../test/fixtures.js";

describe("ListingPreview", () => {
  it("renders a listing draft's title, price, currency, description, and status", () => {
    render(
      <ListingPreview
        listingDraft={makeListingDraft({
          title: "Nike Jacket, Size M",
          suggestedPrice: 42,
          currency: "CAD",
          description: "A Nike jacket in good condition.",
        })}
        isGenerating={false}
      />,
    );

    expect(screen.getByText("Nike Jacket, Size M")).toBeInTheDocument();
    expect(screen.getByText("CA$42.00")).toBeInTheDocument();
    expect(screen.getByText("A Nike jacket in good condition.")).toBeInTheDocument();
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("renders a skeleton while generating with no draft yet", () => {
    const { container } = render(<ListingPreview listingDraft={null} isGenerating />);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it("renders nothing when there is no draft and generation hasn't started", () => {
    const { container } = render(<ListingPreview listingDraft={null} isGenerating={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
