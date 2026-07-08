import { z } from "zod";

export const ItemConditionSchema = z.enum([
  "new",
  "like_new",
  "good",
  "fair",
  "poor",
]);
export type ItemCondition = z.infer<typeof ItemConditionSchema>;

/**
 * The known facts about an item, built up incrementally across a
 * conversation. Every field is optional here by design: which fields are
 * required is a category-dependent, deterministic decision owned by the
 * server FSM, not by this shape. This same schema validates both the full
 * attribute set and partial deltas proposed by the extraction LLM.
 */
export const ItemAttributesSchema = z.object({
  category: z.string().min(1).optional(),
  brand: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  condition: ItemConditionSchema.optional(),
  size: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
  material: z.string().min(1).optional(),
  defects: z.array(z.string().min(1)).optional(),
  originalPrice: z.number().positive().optional(),
  ageOrYear: z.string().min(1).optional(),
  notes: z.string().min(1).optional(),
});
export type ItemAttributes = z.infer<typeof ItemAttributesSchema>;
