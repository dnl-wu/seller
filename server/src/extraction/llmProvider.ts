export interface LlmCompletionRequest {
  system: string;
  user: string;
}

/**
 * Thin seam between anything that needs a raw chat completion and the SDK
 * that actually talks to a model provider. LlmItemAttributeExtractor and
 * LlmListingGenerator depend only on this, not on the OpenAI/Azure SDK
 * directly, so the provider can be swapped (or faked in tests) without
 * touching extraction or listing-generation logic.
 */
export interface LlmProvider {
  complete(request: LlmCompletionRequest): Promise<string>;
}
