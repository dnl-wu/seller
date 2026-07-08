import { z } from "zod";

export const ListingDraftStatusSchema = z.enum(["generated", "approved"]);
export type ListingDraftStatus = z.infer<typeof ListingDraftStatusSchema>;

/**
 * The AI-generated listing artifact. Validating LLM output against this
 * schema is what keeps free-form model output from reaching storage or the
 * client unchecked.
 */
export const ListingDraftSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  suggestedPrice: z.number().positive(),
  status: ListingDraftStatusSchema,
});
export type ListingDraft = z.infer<typeof ListingDraftSchema>;
