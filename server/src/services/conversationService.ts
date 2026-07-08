import { randomUUID } from "node:crypto";
import type { ItemAttributes } from "@seller/shared";
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
import { keywordItemAttributeExtractor } from "../extraction/keywordExtractor.js";
import type { ItemAttributeExtractor } from "../extraction/types.js";

export interface CreatedConversation {
  conversation: ConversationDocument;
  itemDraft: ItemDraftDocument;
}

export async function createConversation(
  sellerId: string,
): Promise<CreatedConversation> {
  const conversation = await createConversationRecord(sellerId);
  const emptyAttributes: ItemAttributes = {};
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
      kind: "ok";
      conversation: ConversationDocument;
      itemDraft: ItemDraftDocument;
      assistantMessage: MessageDocument;
    };

export async function postSellerMessage(
  conversationId: string,
  content: string,
  clientMessageId: string,
  extractor: ItemAttributeExtractor = keywordItemAttributeExtractor,
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

  await createMessage({ conversationId, role: "seller", content, clientMessageId });

  const itemDraft = await findItemDraftByConversation(conversationId);
  if (!itemDraft) {
    throw new Error(`Item draft missing for conversation ${conversationId}`);
  }

  const patch = extractor.extract(content, itemDraft.attributes);
  const mergedAttributes = mergeAttributes(itemDraft.attributes, patch);
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
