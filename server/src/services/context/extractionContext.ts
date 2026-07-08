import type { ItemAttributes, MessageRole } from "@seller/shared";
import type { ContextMessage, ExtractionContext } from "./context.types.js";

export const EXTRACTION_MESSAGE_LIMIT = 6;

interface BuildExtractionContextInput {
  latestMessage: string;
  currentAttributes: ItemAttributes;
  recentMessages?: Array<{
    role?: unknown;
    content?: unknown;
  }>;
  messageLimit?: number;
}

function isMessageRole(value: unknown): value is MessageRole {
  return value === "seller" || value === "assistant";
}

function cloneAttributes(attributes: ItemAttributes): ItemAttributes {
  return {
    ...attributes,
    ...(attributes.defects ? { defects: [...attributes.defects] } : {}),
  };
}

function normalizeMessages(
  messages: BuildExtractionContextInput["recentMessages"],
  latestMessage: string,
): ContextMessage[] {
  const latest = latestMessage.trim();
  const seen = new Set<string>();
  const normalized: ContextMessage[] = [];

  for (const message of messages ?? []) {
    if (!isMessageRole(message.role) || typeof message.content !== "string") {
      continue;
    }

    const content = message.content.trim();
    if (!content) continue;
    if (message.role === "seller" && content === latest) continue;

    const dedupeKey = `${message.role}\n${content}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    normalized.push({ role: message.role, content });
  }

  return normalized;
}

/**
 * The initial extraction policy uses a fixed recent window. That keeps model
 * context predictable, cheap, and testable while still giving the extractor
 * enough local context for corrections like "actually it's a medium".
 */
export function buildExtractionContext(input: BuildExtractionContextInput): ExtractionContext {
  const latestMessage = input.latestMessage.trim();
  const limit = input.messageLimit ?? EXTRACTION_MESSAGE_LIMIT;
  const recentMessages = normalizeMessages(input.recentMessages, latestMessage).slice(-limit);

  return {
    latestMessage,
    currentAttributes: cloneAttributes(input.currentAttributes),
    recentMessages,
  };
}
