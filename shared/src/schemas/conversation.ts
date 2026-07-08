import { z } from "zod";
import { ConversationStateSchema } from "./enums.js";
import { ItemDraftSchema } from "./itemDraft.js";
import { MessageSchema } from "./message.js";
import { ListingDraftSchema } from "./listingDraft.js";

export const ConversationSchema = z.object({
  id: z.string().min(1),
  sellerId: z.string().min(1),
  state: ConversationStateSchema,
  version: z.number().int().nonnegative(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
export type Conversation = z.infer<typeof ConversationSchema>;

export const CreateConversationRequestSchema = z.object({
  sellerId: z.string().min(1),
});
export type CreateConversationRequest = z.infer<
  typeof CreateConversationRequestSchema
>;

export const CreateConversationResponseSchema = z.object({
  conversationId: z.string().min(1),
  state: ConversationStateSchema,
  itemDraft: ItemDraftSchema,
});
export type CreateConversationResponse = z.infer<
  typeof CreateConversationResponseSchema
>;

export const GetConversationResponseSchema = z.object({
  conversation: ConversationSchema,
  itemDraft: ItemDraftSchema.nullable(),
  messages: z.array(MessageSchema),
  listingDraft: ListingDraftSchema.nullable(),
});
export type GetConversationResponse = z.infer<
  typeof GetConversationResponseSchema
>;

export const PostMessageResponseSchema = z.object({
  conversation: ConversationSchema,
  itemDraft: ItemDraftSchema.nullable(),
  assistantMessage: MessageSchema.nullable(),
  listingDraft: ListingDraftSchema.nullable(),
});
export type PostMessageResponse = z.infer<typeof PostMessageResponseSchema>;

export const UpdateListingResponseSchema = GetConversationResponseSchema;
export type UpdateListingResponse = GetConversationResponse;

export const ApproveListingResponseSchema = GetConversationResponseSchema;
export type ApproveListingResponse = GetConversationResponse;
