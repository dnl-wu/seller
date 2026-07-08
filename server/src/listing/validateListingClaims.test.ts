import { describe, expect, it } from "vitest";
import { validateListingClaims } from "./validateListingClaims.js";
import { ListingGenerationValidationError } from "./errors.js";

describe("validateListingClaims", () => {
  it("passes when there are no defects and no perfection claims", () => {
    expect(() =>
      validateListingClaims(
        { title: "t", description: "A good jacket.", suggestedPrice: 10, currency: "CAD" },
        { condition: "good" },
      ),
    ).not.toThrow();
  });

  it("rejects a listing that omits a known defect", () => {
    expect(() =>
      validateListingClaims(
        { title: "t", description: "A nice jacket.", suggestedPrice: 10, currency: "CAD" },
        { defects: ["small stain on sleeve"] },
      ),
    ).toThrow(ListingGenerationValidationError);
  });

  it("passes when the description discloses the known defect", () => {
    expect(() =>
      validateListingClaims(
        {
          title: "t",
          description: "A jacket with a small stain on sleeve.",
          suggestedPrice: 10,
          currency: "CAD",
        },
        { defects: ["small stain on sleeve"] },
      ),
    ).not.toThrow();
  });

  it("rejects a 'works perfectly' claim unless condition is new", () => {
    expect(() =>
      validateListingClaims(
        { title: "t", description: "Works perfectly, like day one.", suggestedPrice: 10, currency: "CAD" },
        { condition: "good" },
      ),
    ).toThrow(ListingGenerationValidationError);
  });

  it("allows a perfection claim when condition is new", () => {
    expect(() =>
      validateListingClaims(
        { title: "t", description: "Brand new, works perfectly.", suggestedPrice: 10, currency: "CAD" },
        { condition: "new" },
      ),
    ).not.toThrow();
  });
});
