import type { AiErrorCode } from "../ai/errors.js";

/**
 * Provider-level failures: timeouts, rate limits, network outages, or other
 * temporary provider problems. The conversation and item draft stay untouched
 * so the same seller message can be retried.
 */
export class ExtractionProviderError extends Error {
  constructor(
    message: string,
    public readonly code: AiErrorCode = "AI_UNAVAILABLE",
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "ExtractionProviderError";
  }
}

/**
 * The provider responded, but the response was not usable structured output.
 */
export class ExtractionValidationError extends Error {
  constructor(
    message: string,
    public readonly code: AiErrorCode = "AI_INVALID_RESPONSE",
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "ExtractionValidationError";
  }
}
