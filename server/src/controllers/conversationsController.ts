import type { Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import {
  CreateConversationRequestSchema,
  PostMessageRequestSchema,
  UpdateListingRequestSchema,
} from "@seller/shared";
import * as conversationService from "../services/conversationService.js";
import type { AiErrorCode } from "../ai/errors.js";
import {
  serializeConversation,
  serializeItemDraft,
  serializeMessage,
  serializeListingDraft,
  serializeConversationDetail,
} from "./serializers.js";

function aiErrorMessage(code: AiErrorCode, task: "Attribute extraction" | "Listing generation"): string {
  switch (code) {
    case "AI_TIMEOUT":
      return `${task} timed out. Please try again.`;
    case "AI_RATE_LIMITED":
      return `${task} is rate limited. Please try again shortly.`;
    case "AI_INVALID_RESPONSE":
      return `${task} returned an unusable response. Please try again.`;
    case "AI_UNAVAILABLE":
      return `${task} is temporarily unavailable. Please try again.`;
    case "AI_MISCONFIGURED":
      return `${task} is not configured correctly.`;
    case "AI_UNKNOWN":
      return `${task} failed unexpectedly. Please try again.`;
  }
}

export async function createConversation(req: Request, res: Response): Promise<void> {
  const parsed = CreateConversationRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  const { conversation, itemDraft } = await conversationService.createConversation(
    parsed.data.sellerId,
  );

  res.status(201).json({
    conversationId: conversation._id.toString(),
    state: conversation.state,
    itemDraft: serializeItemDraft(itemDraft),
  });
}

export async function getConversation(req: Request, res: Response): Promise<void> {
  const conversationId = req.params.id;
  if (!conversationId || !isValidObjectId(conversationId)) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const result = await conversationService.getConversationById(conversationId);
  if (!result) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const { conversation, itemDraft, messages, listingDraft } = result;
  res.json(serializeConversationDetail({ conversation, itemDraft, messages, listingDraft }));
}

export async function postMessage(req: Request, res: Response): Promise<void> {
  const conversationId = req.params.id;
  if (!conversationId || !isValidObjectId(conversationId)) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const parsed = PostMessageRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  const result = await conversationService.postSellerMessage(
    conversationId,
    parsed.data.content,
    parsed.data.clientMessageId,
  );

  switch (result.kind) {
    case "not_found":
      res.status(404).json({ error: "Conversation not found" });
      return;
    case "invalid_state":
      res.status(409).json({
        error: `Cannot accept new messages while conversation is in state "${result.conversation.state}"`,
      });
      return;
    case "extraction_failed": {
      res.status(502).json({
        code: result.reason,
        error: aiErrorMessage(result.reason, "Attribute extraction"),
      });
      return;
    }
    case "listing_generation_failed": {
      res.status(502).json({
        code: result.reason,
        error: aiErrorMessage(result.reason, "Listing generation"),
        conversation: serializeConversation(result.conversation),
        itemDraft: serializeItemDraft(result.itemDraft),
      });
      return;
    }
    case "duplicate":
      res.status(200).json({
        conversation: serializeConversation(result.conversation),
        itemDraft: result.itemDraft ? serializeItemDraft(result.itemDraft) : null,
        assistantMessage: result.assistantMessage
          ? serializeMessage(result.assistantMessage)
          : null,
        listingDraft: result.listingDraft ? serializeListingDraft(result.listingDraft) : null,
      });
      return;
    case "ok":
      res.status(201).json({
        conversation: serializeConversation(result.conversation),
        itemDraft: serializeItemDraft(result.itemDraft),
        assistantMessage: serializeMessage(result.assistantMessage),
        listingDraft: result.listingDraft ? serializeListingDraft(result.listingDraft) : null,
      });
      return;
  }
}

function sendListingMutationResult(
  res: Response,
  result: conversationService.ListingMutationResult,
  action: "approve" | "update",
): void {
  switch (result.kind) {
    case "ok":
      res.json(serializeConversationDetail(result.detail));
      return;
    case "not_found":
      res.status(404).json({ error: "Conversation not found" });
      return;
    case "listing_not_found":
      res.status(404).json({ error: "Listing not found" });
      return;
    case "invalid_state":
      res.status(409).json({
        error:
          action === "approve"
            ? `Listing can only be approved while conversation is in state "draft_ready"; current state is "${result.conversation.state}".`
            : `Listing can only be edited while conversation is in state "draft_ready"; current state is "${result.conversation.state}".`,
      });
      return;
    case "not_editable":
      res.status(409).json({
        error: `Listing is not editable while its status is "${result.listingDraft.status}".`,
      });
      return;
    case "invalid_transition":
      res.status(409).json({ error: result.error.message });
      return;
    case "inconsistent_state":
      res.status(409).json({
        error:
          "Listing and conversation states are inconsistent. Please retry approval before continuing.",
        conversation: serializeConversationDetail(result.detail),
      });
      return;
  }
}

export async function updateListing(req: Request, res: Response): Promise<void> {
  const conversationId = req.params.id;
  if (!conversationId || !isValidObjectId(conversationId)) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const parsed = UpdateListingRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  const result = await conversationService.updateListing(conversationId, parsed.data);
  sendListingMutationResult(res, result, "update");
}

export async function approveListing(req: Request, res: Response): Promise<void> {
  const conversationId = req.params.id;
  if (!conversationId || !isValidObjectId(conversationId)) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const result = await conversationService.approveListing(conversationId);
  sendListingMutationResult(res, result, "approve");
}
