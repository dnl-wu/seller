import { describe, expect, it } from "vitest";
import { LlmItemAttributeExtractor } from "./llmExtractor.js";
import { ExtractionProviderError, ExtractionValidationError } from "./errors.js";
import type { LlmProvider } from "./llmProvider.js";

function fakeProvider(complete: LlmProvider["complete"]): LlmProvider {
  return { complete };
}

const baseInput = { message: "It's a Nike jacket", currentAttributes: {} };

describe("LlmItemAttributeExtractor", () => {
  it("returns a parsed delta for a valid JSON response", async () => {
    const provider = fakeProvider(async () =>
      JSON.stringify({ category: "clothing", brand: "nike" }),
    );
    const extractor = new LlmItemAttributeExtractor(provider);

    const delta = await extractor.extract(baseInput);

    expect(delta).toEqual({ category: "clothing", brand: "nike" });
  });

  it("returns a partial delta when the provider only found some fields", async () => {
    const provider = fakeProvider(async () => JSON.stringify({ category: "clothing" }));
    const extractor = new LlmItemAttributeExtractor(provider);

    const delta = await extractor.extract(baseInput);

    expect(delta).toEqual({ category: "clothing" });
  });

  it("throws ExtractionValidationError for invalid JSON", async () => {
    const provider = fakeProvider(async () => "not json{{{");
    const extractor = new LlmItemAttributeExtractor(provider);

    await expect(extractor.extract(baseInput)).rejects.toThrow(ExtractionValidationError);
  });

  it("throws ExtractionValidationError when the response is not a JSON object", async () => {
    const provider = fakeProvider(async () => JSON.stringify(["clothing"]));
    const extractor = new LlmItemAttributeExtractor(provider);

    await expect(extractor.extract(baseInput)).rejects.toThrow(ExtractionValidationError);
  });

  it("throws ExtractionProviderError for an empty response", async () => {
    const provider = fakeProvider(async () => "");
    const extractor = new LlmItemAttributeExtractor(provider);

    await expect(extractor.extract(baseInput)).rejects.toThrow(ExtractionProviderError);
  });

  it("throws ExtractionProviderError when the provider rejects (timeout/network failure)", async () => {
    const provider = fakeProvider(async () => {
      throw new Error("request timed out");
    });
    const extractor = new LlmItemAttributeExtractor(provider);

    await expect(extractor.extract(baseInput)).rejects.toThrow(ExtractionProviderError);
  });

  it("passes through fields the caller will later validate, including unsupported ones", async () => {
    // LlmItemAttributeExtractor only guarantees "usable JSON object" — schema
    // validation (rejecting unsupported fields) is the service's job.
    const provider = fakeProvider(async () =>
      JSON.stringify({ category: "clothing", waterResistanceRating: "IPX7" }),
    );
    const extractor = new LlmItemAttributeExtractor(provider);

    const delta = await extractor.extract(baseInput);

    expect(delta).toMatchObject({ category: "clothing", waterResistanceRating: "IPX7" });
  });
});
