import type { ItemAttributes, MessageRole } from "@seller/shared";

export interface RecentMessage {
  role: MessageRole;
  content: string;
}

export interface ExtractionInput {
  message: string;
  currentAttributes: ItemAttributes;
  recentMessages?: RecentMessage[];
}

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
  extract(input: ExtractionInput): Promise<ItemAttributeDelta>;
}
