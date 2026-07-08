import type { ExtractionContext } from "../services/context/context.types.js";
import type { ItemAttributes } from "@seller/shared";

export type ItemAttributeDelta = Partial<ItemAttributes>;

/**
 * Boundary between the conversation workflow and whatever produces
 * attribute values from a message. The FSM and service layer only ever
 * talk to this interface, so implementations (keyword-based, LLM-based,
 * or anything else) can be swapped without touching them. Implementations
 * return their best-effort proposed delta; the service layer is
 * responsible for validating and merging it, not the extractor.
 */
export interface ItemAttributeExtractor {
  extract(context: ExtractionContext): Promise<ItemAttributeDelta>;
}
