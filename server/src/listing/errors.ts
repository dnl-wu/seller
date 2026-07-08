/**
 * Thrown for provider-level failures: network errors, timeouts, temporary
 * outages, or an empty response.
 */
export class ListingGenerationProviderError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ListingGenerationProviderError";
  }
}

/**
 * Thrown when the provider responded, but the output could not be turned
 * into a usable object, failed schema validation, or made claims not
 * supported by the structured attributes it was given.
 */
export class ListingGenerationValidationError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ListingGenerationValidationError";
  }
}
