import { randomUUID } from "node:crypto";
import { ItemAttributesSchema } from "@seller/shared";
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
}

export async function getConversationById(
  conversationId: string,
): Promise<ConversationDetail | null> {
  const conversation = await findConversationById(conversationId);
  if (!conversation) return null;

  const [itemDraft, messages] = await Promise.all([
    findItemDraftByConversation(conversationId),
    findMessagesByConversation(conversationId),
  ]);

  return { conversation, itemDraft, messages };
}

export type ExtractionFailureReason = "provider_error" | "invalid_response" | "schema_invalid";

export type PostMessageResult =
  | { kind: "not_found" }
  | { kind: "invalid_state"; conversation: ConversationDocument }
  | {
      kind: "duplicate";
      conversation: ConversationDocument;
      itemDraft: ItemDraftDocument | null;
      assistantMessage: MessageDocument | null;
    }
  | {
      kind: "extraction_failed";
      conversation: ConversationDocument;
      reason: ExtractionFailureReason;
    }
  | {
      kind: "ok";
      conversation: ConversationDocument;
      itemDraft: ItemDraftDocument;
      assistantMessage: MessageDocument;
    };

export async function postSellerMessage(
  conversationId: string,
  content: string,
  clientMessageId: string,
  extractor: ItemAttributeExtractor = getItemAttributeExtractor(),
): Promise<PostMessageResult> {
  const conversation = await findConversationById(conversationId);
  if (!conversation) {
    return { kind: "not_found" };
  }

  // Idempotent retry: return the existing result instead of reprocessing,
  // regardless of what state the conversation has since moved to.
  const existingMessage = await findMessageByClientId(conversationId, clientMessageId);
  if (existingMessage) {
    const [itemDraft, assistantMessage] = await Promise.all([
      findItemDraftByConversation(conversationId),
      findLatestAssistantMessage(conversationId),
    ]);
    return { kind: "duplicate", conversation, itemDraft, assistantMessage };
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

  let assistantContent: string;
  let updatedConversation = conversation;

  if (missingFields.length > 0) {
    const nextField = pickNextMissingField(missingFields);
    assistantContent = nextField
      ? questionForField(nextField)
      : "Could you tell me more about the item?";
  } else {
    assertTransition(conversation.state, "ready_to_generate");
    updatedConversation = await updateConversationState(conversation, "ready_to_generate");
    assistantContent = "Thanks! I have everything I need — your item information is complete.";
  }

  const assistantMessage = await createMessage({
    conversationId,
    role: "assistant",
    content: assistantContent,
    clientMessageId: `assistant-${randomUUID()}`,
  });

  return {
    kind: "ok",
    conversation: updatedConversation,
    itemDraft: updatedDraft,
    assistantMessage,
  };
}
