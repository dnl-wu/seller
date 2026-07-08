import type { Conversation, ItemDraft, ListingDraft, Message } from "@seller/shared";
import type { ConversationDocument } from "../models/Conversation.js";
import type { ItemDraftDocument } from "../models/ItemDraft.js";
import type { MessageDocument } from "../models/Message.js";
import type { ListingDraftDocument } from "../models/ListingDraft.js";
import type { ConversationDetail } from "../services/conversationService.js";

export function serializeConversation(doc: ConversationDocument): Conversation {
  return {
    id: doc._id.toString(),
    sellerId: doc.sellerId,
    state: doc.state,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export function serializeItemDraft(doc: ItemDraftDocument): ItemDraft {
  return {
    id: doc._id.toString(),
    conversationId: doc.conversationId.toString(),
    attributes: doc.attributes,
    missingFields: doc.missingFields,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export function serializeMessage(doc: MessageDocument): Message {
  return {
    id: doc._id.toString(),
    conversationId: doc.conversationId.toString(),
    role: doc.role,
    content: doc.content,
    clientMessageId: doc.clientMessageId,
    createdAt: doc.createdAt.toISOString(),
  };
}

export function serializeListingDraft(doc: ListingDraftDocument): ListingDraft {
  return {
    id: doc._id.toString(),
    conversationId: doc.conversationId.toString(),
    itemDraftId: doc.itemDraftId.toString(),
    title: doc.title,
    description: doc.description,
    suggestedPrice: doc.suggestedPrice,
    currency: doc.currency,
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export function serializeConversationDetail(detail: ConversationDetail) {
  return {
    conversation: serializeConversation(detail.conversation),
    itemDraft: detail.itemDraft ? serializeItemDraft(detail.itemDraft) : null,
    messages: detail.messages.map(serializeMessage),
    listingDraft: detail.listingDraft ? serializeListingDraft(detail.listingDraft) : null,
  };
}
