import { GeneratedListingSchema, type GeneratedListing } from "@seller/shared";
import type { ListingGenerationContext } from "../services/context/context.types.js";
import { classifyAiProviderError } from "../ai/errors.js";
import type { ListingGenerator } from "./types.js";
import type { LlmProvider } from "../extraction/llmProvider.js";
import { ListingGenerationProviderError, ListingGenerationValidationError } from "./errors.js";
import { buildListingPrompt } from "./prompts.js";

const StrictGeneratedListingSchema = GeneratedListingSchema.strict();

/**
 * Real, AI-backed ListingGenerator. It receives only an assembled listing
 * context, parses and validates provider JSON, then returns schema-valid
 * listing content for the deterministic workflow to claims-check and persist.
 */
export class LlmListingGenerator implements ListingGenerator {
  constructor(private readonly provider: LlmProvider) {}

  async generate(context: ListingGenerationContext): Promise<GeneratedListing> {
    let raw: string;
    try {
      raw = await this.provider.complete(buildListingPrompt(context));
    } catch (err) {
      throw new ListingGenerationProviderError(
        "Listing generation provider request failed",
        classifyAiProviderError(err),
        { cause: err },
      );
    }

    if (!raw || !raw.trim()) {
      throw new ListingGenerationValidationError(
        "Listing generation provider returned an empty response",
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new ListingGenerationValidationError(
        "Listing generation response was not valid JSON",
        "AI_INVALID_RESPONSE",
        { cause: err },
      );
    }

    const result = StrictGeneratedListingSchema.safeParse(parsed);
    if (!result.success) {
      throw new ListingGenerationValidationError(
        "Listing generation response failed schema validation",
      );
    }

    return result.data;
  }
}
