import {
  CreateConversationRequestSchema,
  CreateConversationResponseSchema,
  GetConversationResponseSchema,
  PostMessageRequestSchema,
  PostMessageResponseSchema,
  UpdateListingRequestSchema,
  ApproveListingRequestSchema,
  type CreateConversationResponse,
  type GetConversationResponse,
  type PostMessageResponse,
  type ApproveListingRequest,
  type UpdateListingRequest,
} from "@seller/shared";
import type { ZodType } from "zod";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

/**
 * Typed error for any failed API call. `status` is 0 for network-level
 * failures (fetch itself rejected) so callers can distinguish "unreachable"
 * from a real HTTP error status.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

interface ErrorBody {
  error?: string | { code?: string; message?: string };
}

function readErrorMessage(body: unknown): string | undefined {
  if (body && typeof body === "object" && "error" in body) {
    const value = (body as ErrorBody).error;
    if (typeof value === "string") return value;
    return typeof value?.message === "string" ? value.message : undefined;
  }
  return undefined;
}

function readErrorCode(body: unknown): string | undefined {
  if (body && typeof body === "object") {
    const topLevelCode = (body as { code?: unknown }).code;
    if (typeof topLevelCode === "string") return topLevelCode;

    const value = (body as ErrorBody).error;
    if (value && typeof value === "object" && typeof value.code === "string") {
      return value.code;
    }
  }
  return undefined;
}

async function request<T>(
  path: string,
  init: RequestInit,
  schema: ZodType<T>,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers },
    });
  } catch {
    throw new ApiError("The server is unreachable.", 0, "network_error");
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new ApiError(
      readErrorMessage(body) ?? "The server returned an error.",
      response.status,
      readErrorCode(body),
    );
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(
      "The server returned an unexpected response.",
      response.status,
      "invalid_response",
    );
  }

  return parsed.data;
}

export function createConversation(sellerId: string): Promise<CreateConversationResponse> {
  const payload = CreateConversationRequestSchema.parse({ sellerId });
  return request(
    "/api/conversations",
    { method: "POST", body: JSON.stringify(payload) },
    CreateConversationResponseSchema,
  );
}

export function getConversation(conversationId: string): Promise<GetConversationResponse> {
  return request(
    `/api/conversations/${conversationId}`,
    { method: "GET" },
    GetConversationResponseSchema,
  );
}

export function sendMessage(
  conversationId: string,
  input: { content: string; clientMessageId: string },
): Promise<PostMessageResponse> {
  const payload = PostMessageRequestSchema.parse(input);
  return request(
    `/api/conversations/${conversationId}/messages`,
    { method: "POST", body: JSON.stringify(payload) },
    PostMessageResponseSchema,
  );
}

export function updateListing(
  conversationId: string,
  input: UpdateListingRequest,
): Promise<GetConversationResponse> {
  const payload = UpdateListingRequestSchema.parse(input);
  return request(
    `/api/conversations/${conversationId}/listing`,
    { method: "PATCH", body: JSON.stringify(payload) },
    GetConversationResponseSchema,
  );
}

export function approveListing(
  conversationId: string,
  input: ApproveListingRequest,
): Promise<GetConversationResponse> {
  const payload = ApproveListingRequestSchema.parse(input);
  return request(
    `/api/conversations/${conversationId}/listing/approve`,
    { method: "POST", body: JSON.stringify(payload) },
    GetConversationResponseSchema,
  );
}
