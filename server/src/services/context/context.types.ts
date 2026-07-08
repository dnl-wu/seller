import type {
  DescriptionLength,
  ItemAttributes,
  MessageRole,
  PricingStrategy,
  SellerPreferences,
  SupportedCurrency,
  ToneOfVoice,
} from "@seller/shared";

export interface ContextMessage {
  role: MessageRole;
  content: string;
}

export interface ExtractionContext {
  latestMessage: string;
  currentAttributes: ItemAttributes;
  recentMessages: ContextMessage[];
}

export type ListingPreferenceContext = Pick<
  SellerPreferences,
  "toneOfVoice" | "descriptionLength" | "pricingStrategy" | "defaultCurrency"
> & {
  shippingPreference?: string;
};

export interface ListingGenerationContext {
  attributes: ItemAttributes;
  preferences: ListingPreferenceContext;
}

export interface FollowUpQuestionContext {
  missingFields: string[];
  currentAttributes: ItemAttributes;
  toneOfVoice?: ToneOfVoice;
}

export type {
  DescriptionLength,
  PricingStrategy,
  SupportedCurrency,
  ToneOfVoice,
};
