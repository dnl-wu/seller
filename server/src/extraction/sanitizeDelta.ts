/**
 * Strips null, undefined, and empty-string values from a raw extractor
 * delta before schema validation. This is what implements "the model must
 * not overwrite known values with null, empty strings, or missing values":
 * rather than letting one throwaway "I don't know" field fail validation
 * for the entire delta, it's simply treated as absent.
 */
export function sanitizeRawDelta(input: unknown): unknown {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return input;
  }

  const entries = Object.entries(input as Record<string, unknown>).filter(
    ([, value]) => value !== null && value !== undefined && value !== "",
  );
  return Object.fromEntries(entries);
}
