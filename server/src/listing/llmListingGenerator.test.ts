import { describe, expect, it } from "vitest";
import { LlmListingGenerator } from "./llmListingGenerator.js";
import { ListingGenerationProviderError, ListingGenerationValidationError } from "./errors.js";
import type { LlmProvider } from "../extraction/llmProvider.js";

function fakeProvider(complete: LlmProvider["complete"]): LlmProvider {
  return { complete };
}

const baseInput = { attributes: { category: "clothing", brand: "nike" }, currency: "CAD" as const };

describe("LlmListingGenerator", () => {
  it("returns a parsed listing for a valid JSON response", async () => {
    const provider = fakeProvider(async () =>
      JSON.stringify({
        title: "Nike Jacket",
        description: "A Nike jacket in good condition.",
        suggestedPrice: 40,
        currency: "CAD",
      }),
    );
    const generator = new LlmListingGenerator(provider);

    const listing = await generator.generate(baseInput);

    expect(listing).toEqual({
      title: "Nike Jacket",
      description: "A Nike jacket in good condition.",
      suggestedPrice: 40,
      currency: "CAD",
    });
  });

  it("throws ListingGenerationValidationError for invalid JSON", async () => {
    const provider = fakeProvider(async () => "not json{{{");
    const generator = new LlmListingGenerator(provider);

    await expect(generator.generate(baseInput)).rejects.toThrow(ListingGenerationValidationError);
  });

  it("throws ListingGenerationProviderError for an empty response", async () => {
    const provider = fakeProvider(async () => "");
    const generator = new LlmListingGenerator(provider);

    await expect(generator.generate(baseInput)).rejects.toThrow(ListingGenerationProviderError);
  });

  it("throws ListingGenerationProviderError when the provider rejects", async () => {
    const provider = fakeProvider(async () => {
      throw new Error("network error");
    });
    const generator = new LlmListingGenerator(provider);

    await expect(generator.generate(baseInput)).rejects.toThrow(ListingGenerationProviderError);
  });
});
