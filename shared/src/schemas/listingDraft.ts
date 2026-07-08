import { z } from "zod";

export const ListingDraftStatusSchema = z.enum(["generated", "approved"]);
export type ListingDraftStatus = z.infer<typeof ListingDraftStatusSchema>;

export const CURRENCY_CODES = ["CAD", "USD"] as const;
export const CurrencySchema = z.enum(CURRENCY_CODES);
export type Currency = z.infer<typeof CurrencySchema>;

/**
 * Raw AI-generated listing content, before persistence. Validating this
 * shape is what keeps free-form model output from reaching storage or the
 * client unchecked.
 */
export const GeneratedListingSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  suggestedPrice: z.number().finite().nonnegative(),
  currency: CurrencySchema,
});
export type GeneratedListing = z.infer<typeof GeneratedListingSchema>;

export const UpdateListingRequestSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  suggestedPrice: z.number().finite().nonnegative(),
  currency: CurrencySchema,
});
export type UpdateListingRequest = z.infer<typeof UpdateListingRequestSchema>;

export const ListingDraftSchema = z.object({
  id: z.string().min(1),
  conversationId: z.string().min(1),
  itemDraftId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  suggestedPrice: z.number().finite().nonnegative(),
  currency: CurrencySchema,
  status: ListingDraftStatusSchema,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
export type ListingDraft = z.infer<typeof ListingDraftSchema>;
