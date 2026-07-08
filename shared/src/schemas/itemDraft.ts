import { z } from "zod";
import { ItemAttributesSchema } from "./itemAttributes.js";

export const ItemDraftSchema = z.object({
  id: z.string().min(1),
  conversationId: z.string().min(1),
  attributes: ItemAttributesSchema,
  missingFields: z.array(z.string()),
  version: z.number().int().nonnegative(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
export type ItemDraft = z.infer<typeof ItemDraftSchema>;
