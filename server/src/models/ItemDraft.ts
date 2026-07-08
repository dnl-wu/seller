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

export type ItemDraftDocument = HydratedDocument<
  ItemDraftAttrs & { createdAt: Date; updatedAt: Date }
>;
export const ItemDraftModel = model<ItemDraftAttrs>("ItemDraft", itemDraftSchema);

// `timestamps: true` adds createdAt/updatedAt at runtime, but mongoose's
// generic typing doesn't reflect schema options, so results are cast to the
// timestamped ItemDraftDocument type.

export async function createItemDraft(
  conversationId: string,
  attributes: ItemAttributes,
  missingFields: string[],
): Promise<ItemDraftDocument> {
  const doc = await ItemDraftModel.create({ conversationId, attributes, missingFields });
  return doc as ItemDraftDocument;
}

export async function findItemDraftByConversation(
  conversationId: string,
): Promise<ItemDraftDocument | null> {
  const doc = await ItemDraftModel.findOne({ conversationId });
  return doc as ItemDraftDocument | null;
}

export async function updateItemDraft(
  draft: ItemDraftDocument,
  attributes: ItemAttributes,
  missingFields: string[],
): Promise<ItemDraftDocument> {
  draft.attributes = ItemAttributesSchema.parse(attributes);
  draft.missingFields = missingFields;
  const saved = await draft.save();
  return saved as ItemDraftDocument;
}
