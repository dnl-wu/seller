import { randomUUID } from "node:crypto";
import { GeneratedListingSchema, ItemAttributesSchema } from "@seller/shared";
import {
  createConversation as createConversationRecord,
  findConversationById,
  updateConversationState,
  type ConversationDocument,
} from "../models/Conversation.js";
import {
  createMessage,
  findMessageByClientId,
  findMessagesByConversation,
  findRecentMessages,
  findLatestAssistantMessage,
  type MessageDocument,
} from "../models/Message.js";
import {
  createItemDraft,
  findItemDraftByConversation,
  updateItemDraft,
  type ItemDraftDocument,
} from "../models/ItemDraft.js";
import {
  createListingDraft,
  findListingDraftByConversation,
  type ListingDraftDocument,
} from "../models/ListingDraft.js";
import {
  computeMissingFields,
  pickNextMissingField,
  questionForField,
  assertTransition,
} from "../fsm/conversationFsm.js";
import { mergeAttributes } from "../fsm/mergeAttributes.js";
import { getItemAttributeExtractor } from "../extraction/createExtractor.js";
import { sanitizeRawDelta } from "../extraction/sanitizeDelta.js";
import { ExtractionValidationError } from "../extraction/errors.js";
import type { ItemAttributeExtractor } from "../extraction/types.js";
import { getListingGenerator } from "../listing/createListingGenerator.js";
import { DEFAULT_LISTING_CURRENCY } from "../listing/constants.js";
import { validateListingClaims } from "../listing/validateListingClaims.js";
import { ListingGenerationValidationError } from "../listing/errors.js";
import type { ListingGenerator } from "../listing/types.js";

const RECENT_MESSAGES_WINDOW = 6;

export interface CreatedConversation {
  conversation: ConversationDocument;
  itemDraft: ItemDraftDocument;
}

export async function createConversation(
  sellerId: string,
): Promise<CreatedConversation> {
  const conversation = await createConversationRecord(sellerId);
  const emptyAttributes = {};
  const missingFields = computeMissingFields(emptyAttributes);
  const itemDraft = await createItemDraft(
    conversation._id.toString(),
    emptyAttributes,
    missingFields,
  );
  return { conversation, itemDraft };
}

export interface ConversationDetail {
  conversation: ConversationDocument;
  itemDraft: ItemDraftDocument | null;
  messages: MessageDocument[];
  listingDraft: ListingDraftDocument | null;
}

export async function getConversationById(
  conversationId: string,
): Promise<ConversationDetail | null> {
  const conversation = await findConversationById(conversationId);
  if (!conversation) return null;

  const [itemDraft, messages, listingDraft] = await Promise.all([
    findItemDraftByConversation(conversationId),
    findMessagesByConversation(conversationId),
    findListingDraftByConversation(conversationId),
  ]);

  return { conversation, itemDraft, messages, listingDraft };
}

export type ExtractionFailureReason = "provider_error" | "invalid_response" | "schema_invalid";
export type ListingFailureReason = "provider_error" | "invalid_output";

export type PostMessageResult =
  | { kind: "not_found" }
  | { kind: "invalid_state"; conversation: ConversationDocument }
  | {
      kind: "duplicate";
      conversation: ConversationDocument;
      itemDraft: ItemDraftDocument | null;
      assistantMessage: MessageDocument | null;
      listingDraft: ListingDraftDocument | null;
    }
  | {
      kind: "extraction_failed";
      conversation: ConversationDocument;
      reason: ExtractionFailureReason;
    }
  | {
      kind: "listing_generation_failed";
      conversation: ConversationDocument;
      itemDraft: ItemDraftDocument;
      reason: ListingFailureReason;
    }
  | {
      kind: "ok";
      conversation: ConversationDocument;
      itemDraft: ItemDraftDocument;
      assistantMessage: MessageDocument;
      listingDraft: ListingDraftDocument | null;
    };

export async function postSellerMessage(
  conversationId: string,
  content: string,
  clientMessageId: string,
  extractor: ItemAttributeExtractor = getItemAttributeExtractor(),
  listingGenerator: ListingGenerator = getListingGenerator(),
): Promise<PostMessageResult> {
  const conversation = await findConversationById(conversationId);
  if (!conversation) {
    return { kind: "not_found" };
  }

  // Idempotent retry: return the existing result instead of reprocessing,
  // regardless of what state the conversation has since moved to.
  const existingMessage = await findMessageByClientId(conversationId, clientMessageId);
  if (existingMessage) {
    const [itemDraft, assistantMessage, listingDraft] = await Promise.all([
      findItemDraftByConversation(conversationId),
      findLatestAssistantMessage(conversationId),
      findListingDraftByConversation(conversationId),
    ]);
    return { kind: "duplicate", conversation, itemDraft, assistantMessage, listingDraft };
  }

  // This deterministic flow only knows how to collect item facts; once the
  // conversation has moved past COLLECTING there is no defined behavior for
  // a new item-description message, so it's rejected rather than guessed at.
  if (conversation.state !== "collecting") {
    return { kind: "invalid_state", conversation };
  }

  const itemDraft = await findItemDraftByConversation(conversationId);
  if (!itemDraft) {
    throw new Error(`Item draft missing for conversation ${conversationId}`);
  }

  // A small bounded window of recent messages, not the full transcript —
  // enough for the extractor to resolve things like "actually it's a medium"
  // without every request growing with conversation length.
  const recentMessages = await findRecentMessages(conversationId, RECENT_MESSAGES_WINDOW);

  let rawDelta: unknown;
  try {
    rawDelta = await extractor.extract({
      message: content,
      currentAttributes: itemDraft.attributes,
      recentMessages: recentMessages.map((m) => ({ role: m.role, content: m.content })),
    });
  } catch (err) {
    return {
      kind: "extraction_failed",
      conversation,
      reason: err instanceof ExtractionValidationError ? "invalid_response" : "provider_error",
    };
  }

  // Applied uniformly regardless of which extractor produced the delta:
  // null/empty "I don't know" values are dropped rather than failing the
  // whole extraction, and unrecognized invented fields are silently
  // stripped by the schema (zod drops unknown object keys by default)
  // rather than being stored.
  const patchResult = ItemAttributesSchema.safeParse(sanitizeRawDelta(rawDelta));
  if (!patchResult.success) {
    return { kind: "extraction_failed", conversation, reason: "schema_invalid" };
  }

  // Only persist the seller message once extraction has produced valid
  // data — a failed extraction leaves no trace, so resubmitting the same
  // clientMessageId after a transient failure is processed fresh rather
  // than short-circuited by the duplicate check above.
  await createMessage({ conversationId, role: "seller", content, clientMessageId });

  const mergedAttributes = mergeAttributes(itemDraft.attributes, patchResult.data);
  const missingFields = computeMissingFields(mergedAttributes);
  const updatedDraft = await updateItemDraft(itemDraft, mergedAttributes, missingFields);

  if (missingFields.length > 0) {
    const nextField = pickNextMissingField(missingFields);
    const assistantContent = nextField
      ? questionForField(nextField)
      : "Could you tell me more about the item?";

    const assistantMessage = await createMessage({
      conversationId,
      role: "assistant",
      content: assistantContent,
      clientMessageId: `assistant-${randomUUID()}`,
    });

    return {
      kind: "ok",
      conversation,
      itemDraft: updatedDraft,
      assistantMessage,
      listingDraft: null,
    };
  }

  // All required fields are present: walk the FSM through
  // ready_to_generate -> generating, call the listing generator, and land
  // on draft_ready. Any failure past this point rolls the conversation
  // back to ready_to_generate (see the catch block) rather than leaving it
  // stuck in `generating` or with a partially-written listing.
  assertTransition(conversation.state, "ready_to_generate");
  let workingConversation = await updateConversationState(conversation, "ready_to_generate");
  assertTransition(workingConversation.state, "generating");
  workingConversation = await updateConversationState(workingConversation, "generating");

  try {
    const rawListing = await listingGenerator.generate({
      attributes: mergedAttributes,
      currency: DEFAULT_LISTING_CURRENCY,
    });

    const listingResult = GeneratedListingSchema.safeParse(rawListing);
    if (!listingResult.success) {
      throw new ListingGenerationValidationError("Generated listing failed schema validation");
    }
    validateListingClaims(listingResult.data, mergedAttributes);

    const listingDraft = await createListingDraft(
      conversationId,
      updatedDraft._id.toString(),
      listingResult.data,
    );

    assertTransition(workingConversation.state, "draft_ready");
    workingConversation = await updateConversationState(workingConversation, "draft_ready");

    const assistantMessage = await createMessage({
      conversationId,
      role: "assistant",
      content: "Your listing draft is ready for review.",
      clientMessageId: `assistant-${randomUUID()}`,
    });

    return {
      kind: "ok",
      conversation: workingConversation,
      itemDraft: updatedDraft,
      assistantMessage,
      listingDraft,
    };
  } catch (err) {
    // No partial ListingDraft exists (createListingDraft only runs after
    // schema + claims validation succeed), so the item facts are
    // untouched. Roll back to ready_to_generate — the direct predecessor
    // of `generating` — so this is retryable instead of a dead end.
    workingConversation = await updateConversationState(workingConversation, "ready_to_generate");
    return {
      kind: "listing_generation_failed",
      conversation: workingConversation,
      itemDraft: updatedDraft,
      reason: err instanceof ListingGenerationValidationError ? "invalid_output" : "provider_error",
    };
  }
}
