import type { AiErrorCode } from "../ai/errors.js";

/**
 * Provider-level failures: timeouts, rate limits, network outages, or other
 * temporary provider problems.
 */
export class ListingGenerationProviderError extends Error {
  constructor(
    message: string,
    public readonly code: AiErrorCode = "AI_UNAVAILABLE",
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "ListingGenerationProviderError";
  }
}

/**
 * The provider responded, but the output could not be turned into schema-valid
 * listing data or made claims unsupported by the structured item facts.
 */
export class ListingGenerationValidationError extends Error {
  constructor(
    message: string,
    public readonly code: AiErrorCode = "AI_INVALID_RESPONSE",
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "ListingGenerationValidationError";
  }
}
