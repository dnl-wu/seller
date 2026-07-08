import { z } from "zod";
import { CurrencySchema } from "./listingDraft.js";

export const ToneOfVoiceSchema = z.enum(["concise", "friendly", "professional"]);
export type ToneOfVoice = z.infer<typeof ToneOfVoiceSchema>;

export const DescriptionLengthSchema = z.enum(["short", "medium", "detailed"]);
export type DescriptionLength = z.infer<typeof DescriptionLengthSchema>;

export const PricingStrategySchema = z.enum(["sell_fast", "balanced", "maximize_price"]);
export type PricingStrategy = z.infer<typeof PricingStrategySchema>;

export const SupportedCurrencySchema = CurrencySchema;
export type SupportedCurrency = z.infer<typeof SupportedCurrencySchema>;

export const SellerPreferencesSchema = z.object({
  sellerId: z.string().min(1),
  toneOfVoice: ToneOfVoiceSchema,
  descriptionLength: DescriptionLengthSchema,
  pricingStrategy: PricingStrategySchema,
  defaultCurrency: SupportedCurrencySchema,
  shippingPreference: z.string().min(1).optional(),
  createdAt: z.string().min(1).optional(),
  updatedAt: z.string().min(1).optional(),
});
export type SellerPreferences = z.infer<typeof SellerPreferencesSchema>;

export const UpdateSellerPreferencesRequestSchema = z
  .object({
    toneOfVoice: ToneOfVoiceSchema.optional(),
    descriptionLength: DescriptionLengthSchema.optional(),
    pricingStrategy: PricingStrategySchema.optional(),
    defaultCurrency: SupportedCurrencySchema.optional(),
    shippingPreference: z.string().optional(),
  })
  .strict();
export type UpdateSellerPreferencesRequest = z.infer<
  typeof UpdateSellerPreferencesRequestSchema
>;

export const GetSellerPreferencesResponseSchema = SellerPreferencesSchema;
export type GetSellerPreferencesResponse = z.infer<
  typeof GetSellerPreferencesResponseSchema
>;

export const UpdateSellerPreferencesResponseSchema = SellerPreferencesSchema;
export type UpdateSellerPreferencesResponse = z.infer<
  typeof UpdateSellerPreferencesResponseSchema
>;
