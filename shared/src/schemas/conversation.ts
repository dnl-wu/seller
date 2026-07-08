import { z } from "zod";
import { ConversationStateSchema } from "./enums.js";
import { ItemDraftSchema } from "./itemDraft.js";
import { MessageSchema } from "./message.js";

export const ConversationSchema = z.object({
  id: z.string().min(1),
  sellerId: z.string().min(1),
  state: ConversationStateSchema,
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
});
export type GetConversationResponse = z.infer<
  typeof GetConversationResponseSchema
>;

export const PostMessageResponseSchema = z.object({
  conversation: ConversationSchema,
  itemDraft: ItemDraftSchema.nullable(),
  assistantMessage: MessageSchema.nullable(),
});
export type PostMessageResponse = z.infer<typeof PostMessageResponseSchema>;
