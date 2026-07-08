import type {
  Conversation,
  ConversationState,
  ItemAttributes,
  ItemDraft,
  ListingDraft,
  Message,
} from "@seller/shared";

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

export function makeConversation(state: ConversationState = "collecting"): Conversation {
  return {
    id: "conv-1",
    sellerId: "seller-1",
    state,
    version: 0,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };
}

export function makeItemDraft(
  attributes: ItemAttributes = {},
  missingFields: string[] = ["category", "condition", "size", "brand"],
): ItemDraft {
  return {
    id: "draft-1",
    conversationId: "conv-1",
    attributes,
    missingFields,
    version: 0,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };
}

export function makeMessage(role: "seller" | "assistant", content: string): Message {
  return {
    id: nextId("msg"),
    conversationId: "conv-1",
    role,
    content,
    clientMessageId: nextId("client"),
    createdAt: "2024-01-01T00:00:00.000Z",
  };
}

export function makeListingDraft(overrides: Partial<ListingDraft> = {}): ListingDraft {
  return {
    id: "listing-1",
    conversationId: "conv-1",
    itemDraftId: "draft-1",
    title: "Nike Jacket",
    description: "A Nike jacket in good condition.",
    suggestedPrice: 40,
    currency: "CAD",
    status: "generated",
    version: 0,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}
