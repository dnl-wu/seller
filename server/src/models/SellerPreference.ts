import { Schema, model, type HydratedDocument } from "mongoose";
import {
  DescriptionLengthSchema,
  PricingStrategySchema,
  SupportedCurrencySchema,
  ToneOfVoiceSchema,
  type DescriptionLength,
  type PricingStrategy,
  type SupportedCurrency,
  type ToneOfVoice,
} from "@seller/shared";

export interface SellerPreferenceAttrs {
  sellerId: string;
  toneOfVoice: ToneOfVoice;
  descriptionLength: DescriptionLength;
  pricingStrategy: PricingStrategy;
  defaultCurrency: SupportedCurrency;
  shippingPreference?: string;
}

const sellerPreferenceSchema = new Schema<SellerPreferenceAttrs>(
  {
    sellerId: { type: String, required: true, unique: true, trim: true },
    toneOfVoice: {
      type: String,
      enum: ToneOfVoiceSchema.options,
      required: true,
    },
    descriptionLength: {
      type: String,
      enum: DescriptionLengthSchema.options,
      required: true,
    },
    pricingStrategy: {
      type: String,
      enum: PricingStrategySchema.options,
      required: true,
    },
    defaultCurrency: {
      type: String,
      enum: SupportedCurrencySchema.options,
      required: true,
    },
    shippingPreference: { type: String, trim: true },
  },
  { timestamps: true },
);

sellerPreferenceSchema.index({ sellerId: 1 }, { unique: true });

export type SellerPreferenceDocument = HydratedDocument<
  SellerPreferenceAttrs & { createdAt: Date; updatedAt: Date }
>;

export const SellerPreferenceModel = model<SellerPreferenceAttrs>(
  "SellerPreference",
  sellerPreferenceSchema,
);

export async function findSellerPreferenceBySellerId(
  sellerId: string,
): Promise<SellerPreferenceDocument | null> {
  const doc = await SellerPreferenceModel.findOne({ sellerId });
  return doc as SellerPreferenceDocument | null;
}

export async function upsertSellerPreference(
  sellerId: string,
  preferences: Omit<SellerPreferenceAttrs, "sellerId">,
): Promise<SellerPreferenceDocument> {
  const doc = await SellerPreferenceModel.findOneAndUpdate(
    { sellerId },
    { $set: { sellerId, ...preferences } },
    { new: true, runValidators: true, setDefaultsOnInsert: true, upsert: true },
  );
  return doc as SellerPreferenceDocument;
}
