import { z } from "zod";

export const ApiErrorCodeSchema = z.enum([
  "CONCURRENCY_CONFLICT",
  "STALE_LISTING_VERSION",
  "STALE_CONVERSATION_VERSION",
]);
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

export const ApiErrorResponseSchema = z.object({
  error: z.object({
    code: ApiErrorCodeSchema,
    message: z.string().min(1),
    retryable: z.boolean(),
  }),
});
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
