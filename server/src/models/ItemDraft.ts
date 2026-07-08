import { Schema, model, type HydratedDocument, type Types } from "mongoose";
import { ItemAttributesSchema, type ItemAttributes } from "@seller/shared";
import { ConcurrencyConflictError, versionPredicate } from "../concurrency/errors.js";

export interface ItemDraftAttrs {
  conversationId: Types.ObjectId;
  attributes: ItemAttributes;
  missingFields: string[];
  version: number;
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
    version: { type: Number, required: true, default: 0 },
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
  const doc = await ItemDraftModel.create({ conversationId, attributes, missingFields, version: 0 });
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
  const doc = await ItemDraftModel.findOneAndUpdate(
    { _id: draft._id, ...versionPredicate(draft.version ?? 0) },
    {
      $set: {
        attributes: ItemAttributesSchema.parse(attributes),
        missingFields,
      },
      $inc: { version: 1 },
    },
    { new: true, runValidators: true },
  );
  if (!doc) {
    throw new ConcurrencyConflictError("CONCURRENCY_CONFLICT");
  }
  return doc as ItemDraftDocument;
}
