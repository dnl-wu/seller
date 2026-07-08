import { Schema, model, type HydratedDocument, type Types } from "mongoose";
import { MessageRoleSchema, type MessageRole } from "@seller/shared";

export interface MessageAttrs {
  conversationId: Types.ObjectId;
  role: MessageRole;
  content: string;
  clientMessageId: string;
}

const messageSchema = new Schema<MessageAttrs>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    role: { type: String, enum: MessageRoleSchema.options, required: true },
    content: { type: String, required: true },
    clientMessageId: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ conversationId: 1, clientMessageId: 1 }, { unique: true });

// Messages are append-only: block mutation/removal at the model layer as a
// defensive backstop, even though the service layer never calls these.
function rejectMutation(next: (err?: Error) => void): void {
  next(new Error("Messages are append-only and cannot be modified or deleted"));
}
messageSchema.pre("updateOne", rejectMutation);
messageSchema.pre("updateMany", rejectMutation);
messageSchema.pre("findOneAndUpdate", rejectMutation);
messageSchema.pre("deleteOne", rejectMutation);
messageSchema.pre("findOneAndDelete", rejectMutation);

export type MessageDocument = HydratedDocument<MessageAttrs>;
export const MessageModel = model<MessageAttrs>("Message", messageSchema);

export async function createMessage(input: {
  conversationId: string;
  role: MessageRole;
  content: string;
  clientMessageId: string;
}): Promise<MessageDocument> {
  return MessageModel.create(input);
}

export async function findMessageByClientId(
  conversationId: string,
  clientMessageId: string,
): Promise<MessageDocument | null> {
  return MessageModel.findOne({ conversationId, clientMessageId });
}

export async function findMessagesByConversation(
  conversationId: string,
): Promise<MessageDocument[]> {
  return MessageModel.find({ conversationId }).sort({ createdAt: 1 });
}

export async function findLatestAssistantMessage(
  conversationId: string,
): Promise<MessageDocument | null> {
  return MessageModel.findOne({ conversationId, role: "assistant" }).sort({
    createdAt: -1,
  });
}
