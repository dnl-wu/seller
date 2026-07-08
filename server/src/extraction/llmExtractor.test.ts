import { describe, expect, it } from "vitest";
import { LlmItemAttributeExtractor } from "./llmExtractor.js";
import { ExtractionValidationError } from "./errors.js";
import type { LlmProvider } from "./llmProvider.js";

function fakeProvider(complete: LlmProvider["complete"]): LlmProvider {
  return { complete };
}

const baseInput = {
  latestMessage: "It's a Nike jacket",
  currentAttributes: {},
  recentMessages: [],
};

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

  it("includes bounded context and existing attributes in the provider prompt", async () => {
    let userPrompt = "";
    const provider = fakeProvider(async (input) => {
      userPrompt = input.user;
      return JSON.stringify({ condition: "fair" });
    });
    const extractor = new LlmItemAttributeExtractor(provider);

    await extractor.extract({
      latestMessage: "Actually it is fair",
      currentAttributes: { condition: "good" },
      recentMessages: [{ role: "assistant", content: "What condition?" }],
    });

    expect(userPrompt).toContain("assistant: What condition?");
    expect(userPrompt).toContain('"condition":"good"');
    expect(userPrompt).toContain("Actually it is fair");
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

  it("throws ExtractionValidationError for unsupported fields", async () => {
    const provider = fakeProvider(async () =>
      JSON.stringify({ category: "clothing", waterResistanceRating: "IPX7" }),
    );
    const extractor = new LlmItemAttributeExtractor(provider);

    await expect(extractor.extract(baseInput)).rejects.toThrow(ExtractionValidationError);
  });

  it("throws ExtractionValidationError for an empty response", async () => {
    const provider = fakeProvider(async () => "");
    const extractor = new LlmItemAttributeExtractor(provider);

    await expect(extractor.extract(baseInput)).rejects.toThrow(ExtractionValidationError);
  });

  it("throws ExtractionProviderError when the provider rejects and classifies timeouts", async () => {
    const provider = fakeProvider(async () => {
      throw new Error("request timed out");
    });
    const extractor = new LlmItemAttributeExtractor(provider);

    await expect(extractor.extract(baseInput)).rejects.toMatchObject({
      code: "AI_TIMEOUT",
    });
  });
});
