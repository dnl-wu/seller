import { env } from "../config/env.js";
import { keywordItemAttributeExtractor } from "./keywordExtractor.js";
import { LlmItemAttributeExtractor } from "./llmExtractor.js";
import { AzureOpenAiProvider } from "./azureOpenAiProvider.js";
import type { ItemAttributeExtractor } from "./types.js";

let cached: ItemAttributeExtractor | undefined;

export function getItemAttributeExtractor(): ItemAttributeExtractor {
  if (!cached) {
    cached =
      env.attributeExtractor === "llm"
        ? new LlmItemAttributeExtractor(new AzureOpenAiProvider())
        : keywordItemAttributeExtractor;
  }
  return cached;
}
