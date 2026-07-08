import type { ItemAttributes, SellerPreferences } from "@seller/shared";
import type {
  ListingGenerationContext,
  ListingPreferenceContext,
} from "./context.types.js";

function cloneAttributes(attributes: ItemAttributes): ItemAttributes {
  return {
    ...attributes,
    ...(attributes.defects ? { defects: [...attributes.defects] } : {}),
  };
}

function buildPreferenceContext(preferences: SellerPreferences): ListingPreferenceContext {
  return {
    toneOfVoice: preferences.toneOfVoice,
    descriptionLength: preferences.descriptionLength,
    pricingStrategy: preferences.pricingStrategy,
    defaultCurrency: preferences.defaultCurrency,
    ...(preferences.shippingPreference
      ? { shippingPreference: preferences.shippingPreference }
      : {}),
  };
}

export function buildListingGenerationContext(input: {
  attributes: ItemAttributes;
  preferences: SellerPreferences;
}): ListingGenerationContext {
  return {
    attributes: cloneAttributes(input.attributes),
    preferences: buildPreferenceContext(input.preferences),
  };
}
