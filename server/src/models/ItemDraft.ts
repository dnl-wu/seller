import { Schema, model, type HydratedDocument, type Types } from "mongoose";
import { ItemAttributesSchema, type ItemAttributes } from "@seller/shared";

export interface ItemDraftAttrs {
  conversationId: Types.ObjectId;
  attributes: ItemAttributes;
  missingFields: string[];
}

const itemDraftSchema = new Schema<ItemDraftAttrs>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      unique: true,
    },
    attributes: { type: Schema.Types.Mixed, default: {} },
    missingFields: { type: [String], default: [] },
  },
  { timestamps: true },
);

export type ItemDraftDocument = HydratedDocument<ItemDraftAttrs>;
export const ItemDraftModel = model<ItemDraftAttrs>("ItemDraft", itemDraftSchema);

export async function createItemDraft(
  conversationId: string,
  attributes: ItemAttributes,
  missingFields: string[],
): Promise<ItemDraftDocument> {
  return ItemDraftModel.create({ conversationId, attributes, missingFields });
}

export async function findItemDraftByConversation(
  conversationId: string,
): Promise<ItemDraftDocument | null> {
  return ItemDraftModel.findOne({ conversationId });
}

export async function updateItemDraft(
  draft: ItemDraftDocument,
  attributes: ItemAttributes,
  missingFields: string[],
): Promise<ItemDraftDocument> {
  draft.attributes = ItemAttributesSchema.parse(attributes);
  draft.missingFields = missingFields;
  return draft.save();
}
