import { ItemAttributesSchema } from "@seller/shared";
import type { ExtractionInput, ItemAttributeDelta, ItemAttributeExtractor } from "./types.js";
import type { LlmProvider } from "./llmProvider.js";
import { ExtractionProviderError, ExtractionValidationError } from "./errors.js";

const SUPPORTED_FIELDS = Object.keys(ItemAttributesSchema.shape);

function buildSystemPrompt(): string {
  return [
    "You extract structured resale-item attributes from a seller's chat message.",
    `Only return JSON with a subset of these fields: ${SUPPORTED_FIELDS.join(", ")}.`,
    "Only include a field if the seller's message states it explicitly.",
    "Never guess, infer, or invent a value the seller did not state.",
    "Never infer product specifications from general knowledge about the brand or model.",
    "Omit any field you are not confident about — do not use null or empty strings for unknown fields.",
    "Respond with a single JSON object and nothing else.",
  ].join(" ");
}

function buildUserPrompt(input: ExtractionInput): string {
  const lines: string[] = [];
  if (input.recentMessages?.length) {
    lines.push("Recent conversation (for context only):");
    for (const entry of input.recentMessages) {
      lines.push(`${entry.role}: ${entry.content}`);
    }
  }
  lines.push("Known attributes so far:");
  lines.push(JSON.stringify(input.currentAttributes));
  lines.push("Latest seller message:");
  lines.push(input.message);
  return lines.join("\n");
}

/**
 * Real, AI-backed ItemAttributeExtractor. Only responsible for getting a
 * usable JSON object out of the provider — schema validation of the
 * *contents* (sanitizing nulls, rejecting unsupported values, stripping
 * unknown fields) happens uniformly in the service layer for every
 * extractor implementation, not here.
 */
export class LlmItemAttributeExtractor implements ItemAttributeExtractor {
  constructor(private readonly provider: LlmProvider) {}

  async extract(input: ExtractionInput): Promise<ItemAttributeDelta> {
    let raw: string;
    try {
      raw = await this.provider.complete({
        system: buildSystemPrompt(),
        user: buildUserPrompt(input),
      });
    } catch (err) {
      throw new ExtractionProviderError("Attribute extraction provider request failed", {
        cause: err,
      });
    }

    if (!raw || !raw.trim()) {
      throw new ExtractionProviderError(
        "Attribute extraction provider returned an empty response",
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new ExtractionValidationError(
        "Attribute extraction response was not valid JSON",
        { cause: err },
      );
    }

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new ExtractionValidationError(
        "Attribute extraction response was not a JSON object",
      );
    }

    return parsed as ItemAttributeDelta;
  }
}
