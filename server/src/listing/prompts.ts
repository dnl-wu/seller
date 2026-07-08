import type { LlmCompletionRequest } from "../extraction/llmProvider.js";
import type { ListingGenerationContext } from "../services/context/context.types.js";

export const LISTING_PROMPT_VERSION = "listing-v1";

export function buildListingPrompt({
  attributes,
  preferences,
}: ListingGenerationContext): LlmCompletionRequest {
  const system = [
    `Prompt version: ${LISTING_PROMPT_VERSION}.`,
    "You write a resale marketplace listing from structured item attributes only.",
    "Item attributes are the factual source of truth.",
    "Seller preferences affect style and strategy only.",
    "Known defects must be disclosed.",
    "Do not invent specifications.",
    "Do not claim real market-comparable data unless supplied.",
    "Do not claim an item works perfectly unless explicitly supported.",
    "Respect currency and description-length preferences.",
    "Return only schema-valid structured output.",
    "Respond with a single JSON object with exactly these fields: title, description, suggestedPrice, currency.",
  ].join(" ");

  const user = [
    `Requested currency: ${preferences.defaultCurrency}`,
    `Tone of voice: ${preferences.toneOfVoice}`,
    `Description length: ${preferences.descriptionLength}`,
    `Pricing strategy: ${preferences.pricingStrategy}`,
    preferences.shippingPreference
      ? `Explicit seller shipping preference: ${preferences.shippingPreference}`
      : "Explicit seller shipping preference: none",
    "Structured item attributes:",
    JSON.stringify(attributes),
  ].join("\n");

  return { system, user };
}
