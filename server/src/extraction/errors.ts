/**
 * Thrown for provider-level failures: network errors, timeouts, temporary
 * outages, or an empty response. These are treated as retryable — the
 * conversation and item draft are left untouched so the same message can
 * be resubmitted.
 */
export class ExtractionProviderError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ExtractionProviderError";
  }
}

/**
 * Thrown when the provider responded, but the response could not be
 * turned into usable data (not JSON, not a JSON object).
 */
export class ExtractionValidationError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ExtractionValidationError";
  }
}
