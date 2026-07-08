import type { GeneratedListing } from "@seller/shared";
import type { ListingGenerationInput, ListingGenerator } from "./types.js";
import type { LlmProvider } from "../extraction/llmProvider.js";
import { ListingGenerationProviderError, ListingGenerationValidationError } from "./errors.js";

function buildSystemPrompt(): string {
  return [
    "You write a resale marketplace listing from structured item attributes only.",
    "Only state facts present in the provided attributes — never invent specifications, materials, or features.",
    "If defects are listed, clearly disclose them in the description.",
    'Do not claim the item "works perfectly", is "flawless", or is in perfect condition unless the condition attribute is "new".',
    "Respond with a single JSON object with exactly these fields: title, description, suggestedPrice, currency.",
  ].join(" ");
}

function buildUserPrompt({ attributes, currency }: ListingGenerationInput): string {
  return [
    `Currency: ${currency}`,
    "Structured item attributes (the only source of truth for this listing):",
    JSON.stringify(attributes),
  ].join("\n");
}

/**
 * Real, AI-backed ListingGenerator. As with LlmItemAttributeExtractor, this
 * is only responsible for getting a usable JSON object out of the
 * provider — schema and claims validation happen uniformly in the service
 * layer for every generator implementation, not here.
 */
export class LlmListingGenerator implements ListingGenerator {
  constructor(private readonly provider: LlmProvider) {}

  async generate(input: ListingGenerationInput): Promise<GeneratedListing> {
    let raw: string;
    try {
      raw = await this.provider.complete({
        system: buildSystemPrompt(),
        user: buildUserPrompt(input),
      });
    } catch (err) {
      throw new ListingGenerationProviderError("Listing generation provider request failed", {
        cause: err,
      });
    }

    if (!raw || !raw.trim()) {
      throw new ListingGenerationProviderError(
        "Listing generation provider returned an empty response",
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new ListingGenerationValidationError(
        "Listing generation response was not valid JSON",
        { cause: err },
      );
    }

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new ListingGenerationValidationError(
        "Listing generation response was not a JSON object",
      );
    }

    return parsed as GeneratedListing;
  }
}
