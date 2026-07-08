import type { GeneratedListing } from "@seller/shared";
import type { ListingGenerationContext } from "../services/context/context.types.js";

/**
 * Boundary between the conversation workflow and whatever writes listing
 * copy from structured item attributes. Deliberately receives only the
 * validated attributes and structured seller preferences - never the
 * conversation transcript - so a generator implementation cannot base
 * claims on anything but vetted facts and explicit seller settings.
 */
export interface ListingGenerator {
  generate(context: ListingGenerationContext): Promise<GeneratedListing>;
}
