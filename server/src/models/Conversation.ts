import { Schema, model, type HydratedDocument } from "mongoose";
import { ConversationStateSchema, type ConversationState } from "@seller/shared";

export interface ConversationAttrs {
  sellerId: string;
  state: ConversationState;
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
  const doc = await ConversationModel.create({ sellerId, state: "collecting" });
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
  conversation.state = state;
  const saved = await conversation.save();
  return saved as ConversationDocument;
}

export async function transitionConversationState(
  id: string,
  from: ConversationState,
  to: ConversationState,
): Promise<ConversationDocument | null> {
  const doc = await ConversationModel.findOneAndUpdate(
    { _id: id, state: from },
    { $set: { state: to } },
    { new: true, runValidators: true },
  );
  return doc as ConversationDocument | null;
}
