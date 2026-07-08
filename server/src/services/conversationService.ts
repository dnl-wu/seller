import { randomUUID } from "node:crypto";
import {
  GeneratedListingSchema,
  ItemAttributesSchema,
  type ApproveListingRequest,
  type UpdateListingRequest,
} from "@seller/shared";
import type { AiErrorCode } from "../ai/errors.js";
import { ConcurrencyConflictError } from "../concurrency/errors.js";
import { conversationExecutionCoordinator } from "./conversationExecutionCoordinator.js";
import {
  createConversation as createConversationRecord,
  findConversationById,
  transitionConversationState,
  updateConversationState,
  type ConversationDocument,
} from "../models/Conversation.js";
import {
  createMessage,
  findMessageByClientId,
  findMessagesByConversation,
  findRecentMessages,
  findLatestAssistantMessage,
  type MessageDocument,
} from "../models/Message.js";
import {
  createItemDraft,
  findItemDraftByConversation,
  updateItemDraft,
  type ItemDraftDocument,
} from "../models/ItemDraft.js";
import {
  approveGeneratedListingDraft,
  createListingDraft,
  findListingDraftByConversation,
  updateGeneratedListingDraft,
  type ListingDraftDocument,
} from "../models/ListingDraft.js";
import {
  computeMissingFields,
  pickNextMissingField,
  questionForField,
  assertTransition,
} from "../fsm/conversationFsm.js";
import { mergeAttributes } from "../fsm/mergeAttributes.js";
import { getItemAttributeExtractor } from "../extraction/createExtractor.js";
import { sanitizeRawDelta } from "../extraction/sanitizeDelta.js";
import {
  ExtractionProviderError,
  ExtractionValidationError,
} from "../extraction/errors.js";
import type { ItemAttributeExtractor } from "../extraction/types.js";
import {
  buildExtractionContext,
  EXTRACTION_MESSAGE_LIMIT,
} from "./context/extractionContext.js";
import { buildListingGenerationContext } from "./context/listingContext.js";
import { getListingGenerator } from "../listing/createListingGenerator.js";
import { validateListingClaims } from "../listing/validateListingClaims.js";
import {
  ListingGenerationProviderError,
  ListingGenerationValidationError,
} from "../listing/errors.js";
import type { ListingGenerator } from "../listing/types.js";
import { getSellerPreferences } from "./sellerPreferenceService.js";

const StrictItemAttributesSchema = ItemAttributesSchema.strict();

export interface CreatedConversation {
  conversation: ConversationDocument;
  itemDraft: ItemDraftDocument;
}

export async function createConversation(
  sellerId: string,
): Promise<CreatedConversation> {
  const conversation = await createConversationRecord(sellerId);
  const emptyAttributes = {};
  const missingFields = computeMissingFields(emptyAttributes);
  const itemDraft = await createItemDraft(
    conversation._id.toString(),
    emptyAttributes,
    missingFields,
  );
  return { conversation, itemDraft };
}

export interface ConversationDetail {
  conversation: ConversationDocument;
  itemDraft: ItemDraftDocument | null;
  messages: MessageDocument[];
  listingDraft: ListingDraftDocument | null;
}

export async function getConversationById(
  conversationId: string,
): Promise<ConversationDetail | null> {
  const conversation = await findConversationById(conversationId);
  if (!conversation) return null;

  const [itemDraft, messages, listingDraft] = await Promise.all([
    findItemDraftByConversation(conversationId),
    findMessagesByConversation(conversationId),
    findListingDraftByConversation(conversationId),
  ]);

  return { conversation, itemDraft, messages, listingDraft };
}

async function getRequiredConversationDetail(
  conversationId: string,
): Promise<ConversationDetail> {
  const detail = await getConversationById(conversationId);
  if (!detail) {
    throw new Error(`Conversation missing after update: ${conversationId}`);
  }
  return detail;
}

export type ListingMutationResult =
  | { kind: "ok"; detail: ConversationDetail }
  | { kind: "not_found" }
  | { kind: "listing_not_found"; conversation: ConversationDocument }
  | { kind: "invalid_state"; conversation: ConversationDocument }
  | { kind: "concurrency_conflict"; code: "CONCURRENCY_CONFLICT" | "STALE_LISTING_VERSION" | "STALE_CONVERSATION_VERSION" }
  | {
      kind: "not_editable";
      conversation: ConversationDocument;
      listingDraft: ListingDraftDocument;
    }
  | { kind: "invalid_transition"; conversation: ConversationDocument; error: Error }
  | { kind: "inconsistent_state"; detail: ConversationDetail };

export async function updateListing(
  conversationId: string,
  input: UpdateListingRequest,
): Promise<ListingMutationResult> {
  return conversationExecutionCoordinator.runExclusive(conversationId, () =>
    updateListingInner(conversationId, input),
  );
}

async function updateListingInner(
  conversationId: string,
  input: UpdateListingRequest,
): Promise<ListingMutationResult> {
  const conversation = await findConversationById(conversationId);
  if (!conversation) return { kind: "not_found" };

  const listingDraft = await findListingDraftByConversation(conversationId);
  if (!listingDraft) return { kind: "listing_not_found", conversation };

  if (conversation.state !== "draft_ready") {
    return { kind: "invalid_state", conversation };
  }

  if (listingDraft.status !== "generated") {
    return { kind: "not_editable", conversation, listingDraft };
  }

  let updatedListingDraft: ListingDraftDocument | null;
  try {
    updatedListingDraft = await updateGeneratedListingDraft(conversationId, input);
  } catch (err) {
    if (err instanceof ConcurrencyConflictError) {
      return { kind: "concurrency_conflict", code: err.code };
    }
    throw err;
  }
  if (!updatedListingDraft) {
    const latestListingDraft = await findListingDraftByConversation(conversationId);
    if (!latestListingDraft) return { kind: "listing_not_found", conversation };
    return { kind: "not_editable", conversation, listingDraft: latestListingDraft };
  }

  return {
    kind: "ok",
    detail: await getRequiredConversationDetail(conversationId),
  };
}

async function approveDraftReadyConversation(
  conversationId: string,
  expectedConversation?: ConversationDocument,
): Promise<ListingMutationResult> {
  let approvedConversation: ConversationDocument | null = null;
  try {
    approvedConversation = expectedConversation
      ? await updateConversationState(expectedConversation, "approved")
      : await transitionConversationState(conversationId, "draft_ready", "approved");
  } catch (err) {
    if (err instanceof ConcurrencyConflictError) {
      return { kind: "concurrency_conflict", code: err.code };
    }
    throw err;
  }

  if (approvedConversation) {
    return {
      kind: "ok",
      detail: await getRequiredConversationDetail(conversationId),
    };
  }

  const detail = await getRequiredConversationDetail(conversationId);
  if (detail.conversation.state === "approved" && detail.listingDraft?.status === "approved") {
    return { kind: "ok", detail };
  }

  if (detail.conversation.state === "draft_ready" && detail.listingDraft?.status === "approved") {
    const repairedConversation = await transitionConversationState(
      conversationId,
      "draft_ready",
      "approved",
    );
    if (repairedConversation) {
      return {
        kind: "ok",
        detail: await getRequiredConversationDetail(conversationId),
      };
    }
  }

  return { kind: "inconsistent_state", detail };
}

export async function approveListing(
  conversationId: string,
  input: ApproveListingRequest,
): Promise<ListingMutationResult> {
  return conversationExecutionCoordinator.runExclusive(conversationId, () =>
    approveListingInner(conversationId, input),
  );
}

async function approveListingInner(
  conversationId: string,
  input: ApproveListingRequest,
): Promise<ListingMutationResult> {
  const conversation = await findConversationById(conversationId);
  if (!conversation) return { kind: "not_found" };

  const listingDraft = await findListingDraftByConversation(conversationId);
  if (!listingDraft) return { kind: "listing_not_found", conversation };

  if (conversation.state === "approved" && listingDraft.status === "approved") {
    return {
      kind: "ok",
      detail: await getRequiredConversationDetail(conversationId),
    };
  }

  if (conversation.state !== "draft_ready") {
    return { kind: "invalid_state", conversation };
  }

  if (
    listingDraft.status === "generated" &&
    (listingDraft.version ?? 0) !== input.expectedListingVersion
  ) {
    return { kind: "concurrency_conflict", code: "STALE_LISTING_VERSION" };
  }

  if (
    input.expectedConversationVersion !== undefined &&
    (conversation.version ?? 0) !== input.expectedConversationVersion
  ) {
    return { kind: "concurrency_conflict", code: "STALE_CONVERSATION_VERSION" };
  }

  try {
    assertTransition(conversation.state, "approved");
  } catch (err) {
    return {
      kind: "invalid_transition",
      conversation,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }

  if (listingDraft.status === "approved") {
    return approveDraftReadyConversation(conversationId);
  }

  // Approval spans ListingDraft and Conversation. This app currently keeps
  // model helpers simple rather than opening request-level Mongo sessions,
  // so the safest conventional ordering is to approve the listing first
  // (blocking later edits), then transition the conversation with a state
  // guard. If the second write fails, the next approval request repairs the
  // only expected partial state: listing approved, conversation draft_ready.
  let approvedListingDraft: ListingDraftDocument | null;
  try {
    approvedListingDraft = await approveGeneratedListingDraft(
      conversationId,
      input.expectedListingVersion,
    );
  } catch (err) {
    if (err instanceof ConcurrencyConflictError) {
      return { kind: "concurrency_conflict", code: err.code };
    }
    throw err;
  }
  if (!approvedListingDraft) {
    const latestListingDraft = await findListingDraftByConversation(conversationId);
    if (!latestListingDraft) return { kind: "listing_not_found", conversation };
    if (latestListingDraft.status !== "approved") {
      return { kind: "not_editable", conversation, listingDraft: latestListingDraft };
    }
  }

  return approveDraftReadyConversation(conversationId, conversation);
}

export type ExtractionFailureReason = AiErrorCode;
export type ListingFailureReason = AiErrorCode;

function extractionFailureReason(err: unknown): ExtractionFailureReason {
  if (err instanceof ExtractionProviderError || err instanceof ExtractionValidationError) {
    return err.code;
  }
  return "AI_UNKNOWN";
}

function listingFailureReason(err: unknown): ListingFailureReason {
  if (
    err instanceof ListingGenerationProviderError ||
    err instanceof ListingGenerationValidationError
  ) {
    return err.code;
  }
  return "AI_UNKNOWN";
}

function isDuplicateKeyError(err: unknown): boolean {
  return Boolean(err && typeof err === "object" && (err as { code?: unknown }).code === 11000);
}

async function duplicateMessageResult(
  conversation: ConversationDocument,
  conversationId: string,
): Promise<Extract<PostMessageResult, { kind: "duplicate" }>> {
  const [itemDraft, assistantMessage, listingDraft] = await Promise.all([
    findItemDraftByConversation(conversationId),
    findLatestAssistantMessage(conversationId),
    findListingDraftByConversation(conversationId),
  ]);
  return { kind: "duplicate", conversation, itemDraft, assistantMessage, listingDraft };
}

export type PostMessageResult =
  | { kind: "not_found" }
  | { kind: "invalid_state"; conversation: ConversationDocument }
  | {
      kind: "concurrency_conflict";
      conversation: ConversationDocument;
      code: "CONCURRENCY_CONFLICT" | "STALE_CONVERSATION_VERSION" | "STALE_LISTING_VERSION";
    }
  | {
      kind: "duplicate";
      conversation: ConversationDocument;
      itemDraft: ItemDraftDocument | null;
      assistantMessage: MessageDocument | null;
      listingDraft: ListingDraftDocument | null;
    }
  | {
      kind: "extraction_failed";
      conversation: ConversationDocument;
      reason: ExtractionFailureReason;
    }
  | {
      kind: "listing_generation_failed";
      conversation: ConversationDocument;
      itemDraft: ItemDraftDocument;
      reason: ListingFailureReason;
    }
  | {
      kind: "ok";
      conversation: ConversationDocument;
      itemDraft: ItemDraftDocument;
      assistantMessage: MessageDocument;
      listingDraft: ListingDraftDocument | null;
    };

export async function postSellerMessage(
  conversationId: string,
  content: string,
  clientMessageId: string,
  extractor: ItemAttributeExtractor = getItemAttributeExtractor(),
  listingGenerator: ListingGenerator = getListingGenerator(),
): Promise<PostMessageResult> {
  return conversationExecutionCoordinator.runExclusive(conversationId, () =>
    postSellerMessageInner(conversationId, content, clientMessageId, extractor, listingGenerator),
  );
}

async function postSellerMessageInner(
  conversationId: string,
  content: string,
  clientMessageId: string,
  extractor: ItemAttributeExtractor,
  listingGenerator: ListingGenerator,
): Promise<PostMessageResult> {
  const conversation = await findConversationById(conversationId);
  if (!conversation) {
    return { kind: "not_found" };
  }

  // Idempotent retry: return the existing result instead of reprocessing,
  // regardless of what state the conversation has since moved to.
  const existingMessage = await findMessageByClientId(conversationId, clientMessageId);
  if (existingMessage) {
    return duplicateMessageResult(conversation, conversationId);
  }

  // This deterministic flow only knows how to collect item facts; once the
  // conversation has moved past COLLECTING there is no defined behavior for
  // a new item-description message, so it's rejected rather than guessed at.
  if (conversation.state !== "collecting") {
    return { kind: "invalid_state", conversation };
  }

  const itemDraft = await findItemDraftByConversation(conversationId);
  if (!itemDraft) {
    throw new Error(`Item draft missing for conversation ${conversationId}`);
  }

  // A small bounded window of recent messages, not the full transcript —
  // enough for the extractor to resolve things like "actually it's a medium"
  // without every request growing with conversation length.
  const recentMessages = await findRecentMessages(conversationId, EXTRACTION_MESSAGE_LIMIT);
  const extractionContext = buildExtractionContext({
    latestMessage: content,
    currentAttributes: itemDraft.attributes,
    recentMessages: recentMessages.map((m) => ({ role: m.role, content: m.content })),
  });

  let rawDelta: unknown;
  try {
    rawDelta = await extractor.extract(extractionContext);
  } catch (err) {
    return {
      kind: "extraction_failed",
      conversation,
      reason: extractionFailureReason(err),
    };
  }

  // Applied uniformly regardless of which extractor produced the delta:
  // null/empty "I don't know" values are dropped rather than overwriting
  // known facts, and unsupported invented fields fail validation.
  const patchResult = StrictItemAttributesSchema.safeParse(sanitizeRawDelta(rawDelta));
  if (!patchResult.success) {
    return { kind: "extraction_failed", conversation, reason: "AI_INVALID_RESPONSE" };
  }

  // Only persist the seller message once extraction has produced valid
  // data — a failed extraction leaves no trace, so resubmitting the same
  // clientMessageId after a transient failure is processed fresh rather
  // than short-circuited by the duplicate check above.
  try {
    await createMessage({ conversationId, role: "seller", content, clientMessageId });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return duplicateMessageResult(conversation, conversationId);
    }
    throw err;
  }

  const mergedAttributes = mergeAttributes(itemDraft.attributes, patchResult.data);
  const missingFields = computeMissingFields(mergedAttributes);
  let updatedDraft: ItemDraftDocument;
  try {
    updatedDraft = await updateItemDraft(itemDraft, mergedAttributes, missingFields);
  } catch (err) {
    if (err instanceof ConcurrencyConflictError) {
      return { kind: "concurrency_conflict", conversation, code: err.code };
    }
    throw err;
  }

  if (missingFields.length > 0) {
    const nextField = pickNextMissingField(missingFields);
    const assistantContent = nextField
      ? questionForField(nextField)
      : "Could you tell me more about the item?";

    const assistantMessage = await createMessage({
      conversationId,
      role: "assistant",
      content: assistantContent,
      clientMessageId: `assistant-${randomUUID()}`,
    });

    return {
      kind: "ok",
      conversation,
      itemDraft: updatedDraft,
      assistantMessage,
      listingDraft: null,
    };
  }

  // All required fields are present: walk the FSM through
  // ready_to_generate -> generating, call the listing generator, and land
  // on draft_ready. Any failure past this point rolls the conversation
  // back to ready_to_generate (see the catch block) rather than leaving it
  // stuck in `generating` or with a partially-written listing.
  assertTransition(conversation.state, "ready_to_generate");
  let workingConversation: ConversationDocument;
  try {
    workingConversation = await updateConversationState(conversation, "ready_to_generate");
    assertTransition(workingConversation.state, "generating");
    workingConversation = await updateConversationState(workingConversation, "generating");
  } catch (err) {
    if (err instanceof ConcurrencyConflictError) {
      return { kind: "concurrency_conflict", conversation, code: err.code };
    }
    throw err;
  }

  try {
    const preferences = await getSellerPreferences(conversation.sellerId);
    const rawListing = await listingGenerator.generate(buildListingGenerationContext({
      attributes: mergedAttributes,
      preferences,
    }));

    const listingResult = GeneratedListingSchema.safeParse(rawListing);
    if (!listingResult.success) {
      throw new ListingGenerationValidationError("Generated listing failed schema validation");
    }
    validateListingClaims(listingResult.data, mergedAttributes);

    let listingDraft: ListingDraftDocument;
    try {
      listingDraft = await createListingDraft(
        conversationId,
        updatedDraft._id.toString(),
        listingResult.data,
      );
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        const existingListing = await findListingDraftByConversation(conversationId);
        if (existingListing) {
          return {
            kind: "ok",
            conversation: workingConversation,
            itemDraft: updatedDraft,
            assistantMessage: await createMessage({
              conversationId,
              role: "assistant",
              content: "Your listing draft is ready for review.",
              clientMessageId: `assistant-${randomUUID()}`,
            }),
            listingDraft: existingListing,
          };
        }
      }
      throw err;
    }

    assertTransition(workingConversation.state, "draft_ready");
    workingConversation = await updateConversationState(workingConversation, "draft_ready");

    const assistantMessage = await createMessage({
      conversationId,
      role: "assistant",
      content: "Your listing draft is ready for review.",
      clientMessageId: `assistant-${randomUUID()}`,
    });

    return {
      kind: "ok",
      conversation: workingConversation,
      itemDraft: updatedDraft,
      assistantMessage,
      listingDraft,
    };
  } catch (err) {
    if (err instanceof ConcurrencyConflictError) {
      return { kind: "concurrency_conflict", conversation: workingConversation, code: err.code };
    }
    // No partial ListingDraft exists (createListingDraft only runs after
    // schema + claims validation succeed), so the item facts are
    // untouched. Roll back to ready_to_generate — the direct predecessor
    // of `generating` — so this is retryable instead of a dead end.
    workingConversation = await updateConversationState(workingConversation, "ready_to_generate");
    return {
      kind: "listing_generation_failed",
      conversation: workingConversation,
      itemDraft: updatedDraft,
      reason: listingFailureReason(err),
    };
  }
}
