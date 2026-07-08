import { z } from "zod";
import { MessageRoleSchema } from "./enums.js";

export const MessageSchema = z.object({
  id: z.string().min(1),
  conversationId: z.string().min(1),
  role: MessageRoleSchema,
  content: z.string().min(1),
  clientMessageId: z.string().min(1),
  createdAt: z.string().min(1),
});
export type Message = z.infer<typeof MessageSchema>;

export const PostMessageRequestSchema = z.object({
  content: z.string().min(1),
  clientMessageId: z.string().min(1),
});
export type PostMessageRequest = z.infer<typeof PostMessageRequestSchema>;
