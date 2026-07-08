import { Schema, model, type HydratedDocument } from "mongoose";
import { ConversationStateSchema, type ConversationState } from "@seller/shared";

export interface ConversationAttrs {
  sellerId: string;
  state: ConversationState;
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

export type ConversationDocument = HydratedDocument<ConversationAttrs>;
export const ConversationModel = model<ConversationAttrs>(
  "Conversation",
  conversationSchema,
);

export async function createConversation(
  sellerId: string,
): Promise<ConversationDocument> {
  return ConversationModel.create({ sellerId, state: "collecting" });
}

export async function findConversationById(
  id: string,
): Promise<ConversationDocument | null> {
  return ConversationModel.findById(id);
}

export async function updateConversationState(
  conversation: ConversationDocument,
  state: ConversationState,
): Promise<ConversationDocument> {
  conversation.state = state;
  return conversation.save();
}
