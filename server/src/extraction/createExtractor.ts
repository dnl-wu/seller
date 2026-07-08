import { env } from "../config/env.js";
import { keywordItemAttributeExtractor } from "./keywordExtractor.js";
import { LlmItemAttributeExtractor } from "./llmExtractor.js";
import { AzureOpenAiProvider } from "./azureOpenAiProvider.js";
import { FallbackItemAttributeExtractor } from "./fallbackExtractor.js";
import type { ItemAttributeExtractor } from "./types.js";

let cached: ItemAttributeExtractor | undefined;

export function getItemAttributeExtractor(): ItemAttributeExtractor {
  if (!cached) {
    if (env.attributeExtractor === "llm") {
      cached = new LlmItemAttributeExtractor(new AzureOpenAiProvider());
    } else if (env.llm.isConfigured) {
      cached = new FallbackItemAttributeExtractor(
        keywordItemAttributeExtractor,
        new LlmItemAttributeExtractor(new AzureOpenAiProvider()),
      );
    } else {
      cached = keywordItemAttributeExtractor;
    }
  }
  return cached;
}
