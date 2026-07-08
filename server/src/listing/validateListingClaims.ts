import type { GeneratedListing, ItemAttributes } from "@seller/shared";
import { ListingGenerationValidationError } from "./errors.js";

const PERFECT_CONDITION_PHRASES = [
  "works perfectly",
  "perfect condition",
  "flawless",
  "no flaws",
  "no issues",
];

/**
 * Mechanical, best-effort checks that the generated copy stays within what
 * the structured attributes actually support. This can't verify every kind
 * of invented claim, but it catches the two concretely testable rules: known
 * defects must be disclosed, and "works perfectly" / "flawless" language
 * must not appear unless the seller's own condition value says so.
 */
export function validateListingClaims(
  listing: GeneratedListing,
  attributes: ItemAttributes,
): void {
  const description = listing.description.toLowerCase();

  if (attributes.defects && attributes.defects.length > 0) {
    const mentionsADefect = attributes.defects.some((defect) =>
      description.includes(defect.toLowerCase()),
    );
    if (!mentionsADefect) {
      throw new ListingGenerationValidationError(
        "Generated listing description does not disclose known defects",
      );
    }
  }

  const claimsPerfection = PERFECT_CONDITION_PHRASES.some((phrase) =>
    description.includes(phrase),
  );
  if (claimsPerfection && attributes.condition !== "new") {
    throw new ListingGenerationValidationError(
      "Generated listing claims perfect condition unsupported by the item attributes",
    );
  }
}
