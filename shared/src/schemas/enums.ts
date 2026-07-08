import { z } from "zod";

/**
 * The set of states a conversation can be in. This is a data contract only —
 * the rules for transitioning between states live in the server's FSM, not here.
 */
export const ConversationStateSchema = z.enum([
  "collecting",
  "ready_to_generate",
  "generating",
  "draft_ready",
  "approved",
]);
export type ConversationState = z.infer<typeof ConversationStateSchema>;

export const MessageRoleSchema = z.enum(["seller", "assistant"]);
export type MessageRole = z.infer<typeof MessageRoleSchema>;
