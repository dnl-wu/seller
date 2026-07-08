import { Schema, model, type HydratedDocument, type Types } from "mongoose";
import {
  ListingDraftStatusSchema,
  CURRENCY_CODES,
  type ListingDraftStatus,
  type Currency,
} from "@seller/shared";

export interface ListingDraftAttrs {
  conversationId: Types.ObjectId;
  itemDraftId: Types.ObjectId;
  title: string;
  description: string;
  suggestedPrice: number;
  currency: Currency;
  status: ListingDraftStatus;
}

const listingDraftSchema = new Schema<ListingDraftAttrs>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      unique: true,
    },
    itemDraftId: { type: Schema.Types.ObjectId, ref: "ItemDraft", required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    suggestedPrice: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: CURRENCY_CODES, required: true },
    status: {
      type: String,
      enum: ListingDraftStatusSchema.options,
      required: true,
      default: "generated",
    },
  },
  { timestamps: true },
);

export type ListingDraftDocument = HydratedDocument<
  ListingDraftAttrs & { createdAt: Date; updatedAt: Date }
>;
export const ListingDraftModel = model<ListingDraftAttrs>(
  "ListingDraft",
  listingDraftSchema,
);

// `timestamps: true` adds createdAt/updatedAt at runtime, but mongoose's
// generic typing doesn't reflect schema options, so results are cast to the
// timestamped ListingDraftDocument type.

export async function createListingDraft(
  conversationId: string,
  itemDraftId: string,
  listing: { title: string; description: string; suggestedPrice: number; currency: Currency },
): Promise<ListingDraftDocument> {
  const doc = await ListingDraftModel.create({
    conversationId,
    itemDraftId,
    ...listing,
    status: "generated",
  });
  return doc as ListingDraftDocument;
}

export async function findListingDraftByConversation(
  conversationId: string,
): Promise<ListingDraftDocument | null> {
  const doc = await ListingDraftModel.findOne({ conversationId });
  return doc as ListingDraftDocument | null;
}
