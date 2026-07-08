import { z } from "zod";
import { ItemAttributesSchema } from "@seller/shared";
import type { ExtractionContext } from "../services/context/context.types.js";
import { classifyAiProviderError } from "../ai/errors.js";
import type { ItemAttributeDelta, ItemAttributeExtractor } from "./types.js";
import type { LlmProvider } from "./llmProvider.js";
import { ExtractionProviderError, ExtractionValidationError } from "./errors.js";
import { buildExtractionPrompt } from "./prompts.js";

const RawItemAttributeDeltaSchema = z
  .object(
    Object.fromEntries(
      Object.keys(ItemAttributesSchema.shape).map((field) => [field, z.unknown().optional()]),
    ) as z.ZodRawShape,
  )
  .strict();

/**
 * Real, AI-backed ItemAttributeExtractor. It accepts an assembled,
 * provider-neutral ExtractionContext and returns only a proposed delta.
 * The service layer still owns sanitization, schema validation of values,
 * and deterministic merge behavior.
 */
export class LlmItemAttributeExtractor implements ItemAttributeExtractor {
  constructor(private readonly provider: LlmProvider) {}

  async extract(context: ExtractionContext): Promise<ItemAttributeDelta> {
    let raw: string;
    try {
      raw = await this.provider.complete(buildExtractionPrompt(context));
    } catch (err) {
      throw new ExtractionProviderError(
        "Attribute extraction provider request failed",
        classifyAiProviderError(err),
        { cause: err },
      );
    }

    if (!raw || !raw.trim()) {
      throw new ExtractionValidationError(
        "Attribute extraction provider returned an empty response",
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new ExtractionValidationError(
        "Attribute extraction response was not valid JSON",
        "AI_INVALID_RESPONSE",
        { cause: err },
      );
    }

    const result = RawItemAttributeDeltaSchema.safeParse(parsed);
    if (!result.success) {
      throw new ExtractionValidationError(
        "Attribute extraction response did not match the expected JSON object shape",
      );
    }

    return result.data as ItemAttributeDelta;
  }
}
