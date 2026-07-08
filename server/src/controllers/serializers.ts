import type { Conversation, ItemDraft, Message } from "@seller/shared";
import type { ConversationDocument } from "../models/Conversation.js";
import type { ItemDraftDocument } from "../models/ItemDraft.js";
import type { MessageDocument } from "../models/Message.js";

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
