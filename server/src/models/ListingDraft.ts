import { Schema, model, type HydratedDocument, type Types } from "mongoose";
import {
  ListingDraftStatusSchema,
  CURRENCY_CODES,
  type ListingDraftStatus,
  type Currency,
  type UpdateListingRequest,
} from "@seller/shared";
import { ConcurrencyConflictError, versionPredicate } from "../concurrency/errors.js";

export interface ListingDraftAttrs {
  conversationId: Types.ObjectId;
  itemDraftId: Types.ObjectId;
  title: string;
  description: string;
  suggestedPrice: number;
  currency: Currency;
  status: ListingDraftStatus;
  version: number;
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
    version: { type: Number, required: true, default: 0 },
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
    version: 0,
  });
  return doc as ListingDraftDocument;
}

export async function findListingDraftByConversation(
  conversationId: string,
): Promise<ListingDraftDocument | null> {
  const doc = await ListingDraftModel.findOne({ conversationId });
  return doc as ListingDraftDocument | null;
}

export async function updateGeneratedListingDraft(
  conversationId: string,
  input: UpdateListingRequest,
): Promise<ListingDraftDocument | null> {
  const { expectedVersion, ...updates } = input;
  const doc = await ListingDraftModel.findOneAndUpdate(
    { conversationId, status: "generated", ...versionPredicate(expectedVersion) },
    { $set: updates, $inc: { version: 1 } },
    { new: true, runValidators: true },
  );
  if (!doc) {
    throw new ConcurrencyConflictError("STALE_LISTING_VERSION");
  }
  return doc as ListingDraftDocument | null;
}

export async function approveGeneratedListingDraft(
  conversationId: string,
  expectedVersion: number,
): Promise<ListingDraftDocument | null> {
  const doc = await ListingDraftModel.findOneAndUpdate(
    { conversationId, status: "generated", ...versionPredicate(expectedVersion) },
    { $set: { status: "approved" }, $inc: { version: 1 } },
    { new: true, runValidators: true },
  );
  if (!doc) {
    throw new ConcurrencyConflictError("STALE_LISTING_VERSION");
  }
  return doc as ListingDraftDocument | null;
}
