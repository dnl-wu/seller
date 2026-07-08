import { z } from "zod";
import { ConversationStateSchema } from "./enums.js";

export const CreateConversationRequestSchema = z.object({
  sellerId: z.string().min(1).optional(),
});
export type CreateConversationRequest = z.infer<
  typeof CreateConversationRequestSchema
>;

export const CreateConversationResponseSchema = z.object({
  conversationId: z.string().min(1),
  state: ConversationStateSchema,
});
export type CreateConversationResponse = z.infer<
  typeof CreateConversationResponseSchema
>;
