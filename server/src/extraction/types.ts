import type { ItemAttributes } from "@seller/shared";

/**
 * Boundary between the conversation workflow and whatever produces
 * attribute values from a message. The FSM and service layer only ever
 * talk to this interface, so the keyword-based stand-in here can later be
 * swapped for an LLM-backed implementation without touching them.
 */
export interface ItemAttributeExtractor {
  extract(
    message: string,
    currentAttributes: ItemAttributes,
  ): Partial<ItemAttributes>;
}
