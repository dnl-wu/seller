import type { Currency, GeneratedListing, ItemAttributes } from "@seller/shared";

export interface ListingGenerationInput {
  attributes: ItemAttributes;
  currency: Currency;
}

/**
 * Boundary between the conversation workflow and whatever writes listing
 * copy from structured item attributes. Deliberately receives only the
 * validated attributes and a currency — never the conversation transcript
 * — so a generator implementation cannot base claims on anything but the
 * facts already vetted by the FSM/extraction layer.
 */
export interface ListingGenerator {
  generate(input: ListingGenerationInput): Promise<GeneratedListing>;
}
