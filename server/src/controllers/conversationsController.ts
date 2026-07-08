import type { Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import { CreateConversationRequestSchema, PostMessageRequestSchema } from "@seller/shared";
import * as conversationService from "../services/conversationService.js";
import {
  serializeConversation,
  serializeItemDraft,
  serializeMessage,
} from "./serializers.js";

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

  const { conversation, itemDraft, messages } = result;
  res.json({
    conversation: serializeConversation(conversation),
    itemDraft: itemDraft ? serializeItemDraft(itemDraft) : null,
    messages: messages.map(serializeMessage),
  });
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
    case "duplicate":
      res.status(200).json({
        conversation: serializeConversation(result.conversation),
        itemDraft: result.itemDraft ? serializeItemDraft(result.itemDraft) : null,
        assistantMessage: result.assistantMessage
          ? serializeMessage(result.assistantMessage)
          : null,
      });
      return;
    case "ok":
      res.status(201).json({
        conversation: serializeConversation(result.conversation),
        itemDraft: serializeItemDraft(result.itemDraft),
        assistantMessage: serializeMessage(result.assistantMessage),
      });
      return;
  }
}
