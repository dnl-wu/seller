import { Schema, model, type HydratedDocument } from "mongoose";
import { ConversationStateSchema, type ConversationState } from "@seller/shared";
import { ConcurrencyConflictError, versionPredicate } from "../concurrency/errors.js";

export interface ConversationAttrs {
  sellerId: string;
  state: ConversationState;
  version: number;
}

interface ConversationTimestamps {
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<ConversationAttrs>(
  {
    sellerId: { type: String, required: true },
    state: {
      type: String,
      enum: ConversationStateSchema.options,
      required: true,
      default: "collecting",
    },
    version: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

conversationSchema.index({ sellerId: 1 });

export type ConversationDocument = HydratedDocument<
  ConversationAttrs & ConversationTimestamps
>;
export const ConversationModel = model<ConversationAttrs>(
  "Conversation",
  conversationSchema,
);

// `timestamps: true` adds createdAt/updatedAt at runtime, but mongoose's
// generic typing doesn't reflect schema options, so the documents returned
// below are cast to the timestamped ConversationDocument type.

export async function createConversation(
  sellerId: string,
): Promise<ConversationDocument> {
  const doc = await ConversationModel.create({ sellerId, state: "collecting", version: 0 });
  return doc as ConversationDocument;
}

export async function findConversationById(
  id: string,
): Promise<ConversationDocument | null> {
  const doc = await ConversationModel.findById(id);
  return doc as ConversationDocument | null;
}

export async function updateConversationState(
  conversation: ConversationDocument,
  state: ConversationState,
): Promise<ConversationDocument> {
  return updateConversationStateIfVersion(
    conversation._id.toString(),
    conversation.state,
    conversation.version ?? 0,
    state,
  );
}

export async function transitionConversationState(
  id: string,
  from: ConversationState,
  to: ConversationState,
): Promise<ConversationDocument | null> {
  const doc = await ConversationModel.findOneAndUpdate(
    { _id: id, state: from },
    { $set: { state: to }, $inc: { version: 1 } },
    { new: true, runValidators: true },
  );
  return doc as ConversationDocument | null;
}

export async function updateConversationStateIfVersion(
  id: string,
  expectedState: ConversationState,
  expectedVersion: number,
  to: ConversationState,
): Promise<ConversationDocument> {
  const doc = await ConversationModel.findOneAndUpdate(
    { _id: id, state: expectedState, ...versionPredicate(expectedVersion) },
    { $set: { state: to }, $inc: { version: 1 } },
    { new: true, runValidators: true },
  );
  if (!doc) {
    throw new ConcurrencyConflictError("STALE_CONVERSATION_VERSION");
  }
  return doc as ConversationDocument;
}
