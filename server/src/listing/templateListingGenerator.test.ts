import { describe, expect, it } from "vitest";
import { templateListingGenerator } from "./templateListingGenerator.js";

describe("templateListingGenerator", () => {
  it("builds a title and description from structured attributes only", async () => {
    const listing = await templateListingGenerator.generate({
      attributes: {
        category: "clothing",
        brand: "nike",
        size: "M",
        condition: "good",
        color: "black",
      },
      currency: "CAD",
    });

    expect(listing.title).toBe("Nike Clothing Size M");
    expect(listing.description).toContain("Condition: Good.");
    expect(listing.description).toContain("Color: black.");
    expect(listing.currency).toBe("CAD");
    expect(listing.suggestedPrice).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(listing.suggestedPrice)).toBe(true);
  });

  it("discloses known defects in the description", async () => {
    const listing = await templateListingGenerator.generate({
      attributes: { category: "clothing", condition: "fair", defects: ["small stain on sleeve"] },
      currency: "CAD",
    });

    expect(listing.description).toContain("small stain on sleeve");
  });

  it("does not claim an item is defect-free unless condition is new", async () => {
    const listing = await templateListingGenerator.generate({
      attributes: { category: "clothing", condition: "good" },
      currency: "CAD",
    });

    expect(listing.description).not.toMatch(/no known defects/i);
  });

  it("estimates a price from originalPrice and condition when available", async () => {
    const listing = await templateListingGenerator.generate({
      attributes: { category: "clothing", condition: "good", originalPrice: 100 },
      currency: "CAD",
    });

    expect(listing.suggestedPrice).toBe(50);
  });

  it("falls back to a flat non-negative price with no originalPrice", async () => {
    const listing = await templateListingGenerator.generate({
      attributes: { category: "clothing" },
      currency: "CAD",
    });

    expect(listing.suggestedPrice).toBeGreaterThanOrEqual(0);
  });
});
