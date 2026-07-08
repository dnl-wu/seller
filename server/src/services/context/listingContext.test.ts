import { describe, expect, it } from "vitest";
import type { SellerPreferences } from "@seller/shared";
import { buildListingGenerationContext } from "./listingContext.js";

const preferences: SellerPreferences = {
  sellerId: "seller-1",
  toneOfVoice: "friendly",
  descriptionLength: "detailed",
  pricingStrategy: "balanced",
  defaultCurrency: "CAD",
  shippingPreference: "Local pickup preferred.",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

describe("buildListingGenerationContext", () => {
  it("passes only validated attributes and supported preference fields", () => {
    const context = buildListingGenerationContext({
      attributes: { category: "clothing", defects: ["missing button"] },
      preferences,
    });

    expect(context).toEqual({
      attributes: { category: "clothing", defects: ["missing button"] },
      preferences: {
        toneOfVoice: "friendly",
        descriptionLength: "detailed",
        pricingStrategy: "balanced",
        defaultCurrency: "CAD",
        shippingPreference: "Local pickup preferred.",
      },
    });
    expect(context.preferences).not.toHaveProperty("sellerId");
    expect(context.preferences).not.toHaveProperty("createdAt");
    expect(context.preferences).not.toHaveProperty("updatedAt");
  });

  it("does not include conversation messages or previous listings", () => {
    const context = buildListingGenerationContext({
      attributes: { category: "clothing", brand: "nike" },
      preferences,
    });

    expect(context).not.toHaveProperty("messages");
    expect(context).not.toHaveProperty("listingDraft");
    expect(context).not.toHaveProperty("conversation");
  });
});
