import type { ConversationState, MessageRole } from "@seller/shared";
import { ApiError } from "../api/conversations.js";

export type WorkflowStage = "details" | "synthesis" | "review";

const STAGE_BY_STATE: Record<ConversationState, WorkflowStage> = {
  collecting: "details",
  ready_to_generate: "synthesis",
  generating: "synthesis",
  draft_ready: "review",
  approved: "review",
};

export const WORKFLOW_STAGES: readonly WorkflowStage[] = ["details", "synthesis", "review"];

export const WORKFLOW_STAGE_LABELS: Record<WorkflowStage, string> = {
  details: "Details",
  synthesis: "Synthesis",
  review: "Review",
};

/** Single place mapping backend ConversationState onto the 3-step progress UI. */
export function getWorkflowStage(state: ConversationState): WorkflowStage {
  return STAGE_BY_STATE[state];
}

export function getConversationStateLabel(state: ConversationState): string {
  switch (state) {
    case "collecting":
      return "Gathering details";
    case "ready_to_generate":
      return "Ready to generate";
    case "generating":
      return "Generating listing";
    case "draft_ready":
      return "Draft ready for review";
    case "approved":
      return "Approved";
  }
}

/** Whether the conversation currently accepts new seller messages. */
export function isAcceptingMessages(state: ConversationState): boolean {
  return state === "collecting";
}

/** Centralizes role -> display logic instead of scattering `=== "seller"` checks. */
export function isSellerRole(role: MessageRole): boolean {
  return role === "seller";
}

/**
 * Text for the transient "thinking" indicator while a request is in flight.
 * Based on real backend data (current state, remaining missing fields) —
 * never a fabricated multi-step progress simulation.
 */
export function getThinkingLabel(
  state: ConversationState,
  missingFieldCount: number,
): string {
  if (state === "generating") return "Generating listing";
  if (state === "collecting" && missingFieldCount <= 1) return "Generating listing";
  return "Analyzing item details";
}

export interface UiError {
  message: string;
  retryable: boolean;
}

export type ErrorContext = "create" | "send" | "load";

/** Maps technical/API errors onto the user-facing copy shown in the UI. */
export function toUiError(err: unknown, context: ErrorContext): UiError {
  if (err instanceof ApiError) {
    if (err.status === 0) {
      return {
        message: "We couldn't reach the server. Check your connection and try again.",
        retryable: true,
      };
    }
    if (err.status === 404) {
      return {
        message: "This conversation could not be found. Start a new listing to continue.",
        retryable: false,
      };
    }
    if (err.status === 409) {
      return {
        message: "This listing draft is ready, so the conversation is currently locked.",
        retryable: false,
      };
    }
    if (err.code === "invalid_response") {
      return {
        message: "The server returned an unexpected response. Please try again.",
        retryable: true,
      };
    }
    // 502 is how our own backend reports a graceful extraction/listing
    // generation failure, with a message it already wrote to be shown
    // as-is. Any other 5xx is an unexpected server error, so it falls
    // through to the generic, context-specific copy below rather than
    // surfacing whatever raw message came back.
    if (err.status === 502) {
      return {
        message: err.message || "The assistant is temporarily unavailable. Please try again.",
        retryable: true,
      };
    }
  }

  if (context === "send") {
    return {
      message: "We couldn't send your message. Your text has been preserved—try again.",
      retryable: true,
    };
  }
  if (context === "create") {
    return {
      message: "We couldn't start a new conversation. Please try again.",
      retryable: true,
    };
  }
  return { message: "Something went wrong. Please try again.", retryable: true };
}
