import { env } from "../config/env.js";
import { templateListingGenerator } from "./templateListingGenerator.js";
import { LlmListingGenerator } from "./llmListingGenerator.js";
import { AzureOpenAiProvider } from "../extraction/azureOpenAiProvider.js";
import type { ListingGenerator } from "./types.js";

let cached: ListingGenerator | undefined;

export function getListingGenerator(): ListingGenerator {
  if (!cached) {
    cached =
      env.listingGenerator === "llm"
        ? new LlmListingGenerator(new AzureOpenAiProvider())
        : templateListingGenerator;
  }
  return cached;
}
