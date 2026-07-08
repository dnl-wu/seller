import type { SellerPreferences, UpdateSellerPreferencesRequest } from "@seller/shared";
import {
  findSellerPreferenceBySellerId,
  upsertSellerPreference,
  type SellerPreferenceDocument,
} from "../models/SellerPreference.js";
import { buildDefaultSellerPreferences } from "../preferences/defaults.js";

function serializePreferences(doc: SellerPreferenceDocument): SellerPreferences {
  return {
    sellerId: doc.sellerId,
    toneOfVoice: doc.toneOfVoice,
    descriptionLength: doc.descriptionLength,
    pricingStrategy: doc.pricingStrategy,
    defaultCurrency: doc.defaultCurrency,
    ...(doc.shippingPreference ? { shippingPreference: doc.shippingPreference } : {}),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function normalizeShippingPreference(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export async function getSellerPreferences(sellerId: string): Promise<SellerPreferences> {
  const doc = await findSellerPreferenceBySellerId(sellerId);
  if (!doc) return buildDefaultSellerPreferences(sellerId);
  return serializePreferences(doc);
}

export async function updateSellerPreferences(
  sellerId: string,
  patch: UpdateSellerPreferencesRequest,
): Promise<SellerPreferences> {
  const current = await getSellerPreferences(sellerId);
  const shippingPreference = Object.prototype.hasOwnProperty.call(patch, "shippingPreference")
    ? normalizeShippingPreference(patch.shippingPreference)
    : current.shippingPreference;

  const doc = await upsertSellerPreference(sellerId, {
    toneOfVoice: patch.toneOfVoice ?? current.toneOfVoice,
    descriptionLength: patch.descriptionLength ?? current.descriptionLength,
    pricingStrategy: patch.pricingStrategy ?? current.pricingStrategy,
    defaultCurrency: patch.defaultCurrency ?? current.defaultCurrency,
    ...(shippingPreference ? { shippingPreference } : {}),
  });

  if (!shippingPreference && doc.shippingPreference) {
    doc.set("shippingPreference", undefined);
    const saved = await doc.save();
    return serializePreferences(saved as SellerPreferenceDocument);
  }

  return serializePreferences(doc);
}
