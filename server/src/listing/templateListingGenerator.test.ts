import { describe, expect, it } from "vitest";
import type { ListingPreferenceContext } from "../services/context/context.types.js";
import { templateListingGenerator } from "./templateListingGenerator.js";

const basePreferences: ListingPreferenceContext = {
  toneOfVoice: "concise",
  descriptionLength: "medium",
  pricingStrategy: "balanced",
  defaultCurrency: "CAD",
};

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
      preferences: basePreferences,
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
      preferences: { ...basePreferences, descriptionLength: "detailed" },
    });

    expect(listing.description).toContain("small stain on sleeve");
  });

  it("does not claim an item is defect-free unless condition is new", async () => {
    const listing = await templateListingGenerator.generate({
      attributes: { category: "clothing", condition: "good" },
      preferences: basePreferences,
    });

    expect(listing.description).not.toMatch(/no known defects/i);
  });

  it("estimates a price from originalPrice and condition when available", async () => {
    const listing = await templateListingGenerator.generate({
      attributes: { category: "clothing", condition: "good", originalPrice: 100 },
      preferences: basePreferences,
    });

    expect(listing.suggestedPrice).toBe(50);
  });

  it("falls back to a flat non-negative price with no originalPrice", async () => {
    const listing = await templateListingGenerator.generate({
      attributes: { category: "clothing" },
      preferences: basePreferences,
    });

    expect(listing.suggestedPrice).toBeGreaterThanOrEqual(0);
  });

  it("uses seller preference currency", async () => {
    const listing = await templateListingGenerator.generate({
      attributes: { category: "clothing" },
      preferences: { ...basePreferences, defaultCurrency: "USD" },
    });

    expect(listing.currency).toBe("USD");
  });

  it("applies bounded pricing strategy adjustments", async () => {
    const sellFast = await templateListingGenerator.generate({
      attributes: { category: "clothing", condition: "good", originalPrice: 100 },
      preferences: { ...basePreferences, pricingStrategy: "sell_fast" },
    });
    const maximize = await templateListingGenerator.generate({
      attributes: { category: "clothing", condition: "good", originalPrice: 100 },
      preferences: { ...basePreferences, pricingStrategy: "maximize_price" },
    });

    expect(sellFast.suggestedPrice).toBe(45);
    expect(maximize.suggestedPrice).toBe(56);
  });

  it("uses tone, description length, and explicit shipping preference", async () => {
    const listing = await templateListingGenerator.generate({
      attributes: {
        category: "clothing",
        brand: "nike",
        condition: "good",
        color: "black",
      },
      preferences: {
        ...basePreferences,
        toneOfVoice: "professional",
        descriptionLength: "detailed",
        shippingPreference: "Local pickup preferred.",
      },
    });

    expect(listing.description).toContain("prepared for a straightforward resale listing");
    expect(listing.description).toContain("Local pickup preferred.");
  });

  it("keeps short descriptions compact", async () => {
    const listing = await templateListingGenerator.generate({
      attributes: {
        category: "clothing",
        condition: "good",
        color: "black",
        material: "cotton",
      },
      preferences: { ...basePreferences, descriptionLength: "short" },
    });

    expect(listing.description.split(".").filter(Boolean).length).toBeLessThanOrEqual(2);
  });
});
